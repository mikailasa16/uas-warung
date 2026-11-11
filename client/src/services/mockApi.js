// Backend palsu di perangkat (disimpan di AsyncStorage/localStorage) - perilakunya meniru server asli.
import { kv } from './storage';
import { SEED_USERS, SEED_CATEGORIES, SEED_PRODUCTS } from './seedData';
import { LOW_STOCK, parseYmd, rangeFor, startOfDay, ymd } from '../utils/format';

const KEY = 'mockdb_v1';
let db = null;
let currentUser = null;

const fail = (message, status = 400) => {
  const e = new Error(message);
  e.status = status;
  return e;
};
const sum = (rows) => rows.reduce((s, t) => s + t.totalAmount, 0);

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeTrx(user, lines, createdAt, seq, payment) {
  const details = lines.map((l, i) => ({
    id: `d${seq}-${i}`,
    productId: l.product.id,
    quantity: l.quantity,
    unitPrice: l.product.sellingPrice,
    subtotal: l.product.sellingPrice * l.quantity,
  }));
  const total = details.reduce((s, d) => s + d.subtotal, 0);
  const paid = payment ?? Math.ceil(total / 5000) * 5000;
  return {
    id: `t${seq}`,
    transactionNumber: `TRX-${ymd(createdAt).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`,
    userId: user.id,
    totalAmount: total,
    paymentAmount: paid,
    changeAmount: paid - total,
    createdAt: createdAt.toISOString(),
    details,
  };
}

function buildSeed() {
  const d = {
    users: SEED_USERS.map((u) => ({ ...u })),
    categories: SEED_CATEGORIES.map((c) => ({ ...c })),
    products: SEED_PRODUCTS.map((p) => ({ ...p })),
    transactions: [],
    seq: 1,
  };
  const rand = rng(42);
  const now = new Date();
  for (let back = 6; back >= 0; back--) {
    const n = back === 0 ? 3 : 2 + (back % 3);
    for (let i = 0; i < n; i++) {
      const count = 1 + Math.floor(rand() * 4);
      const used = new Set();
      const lines = [];
      while (lines.length < count) {
        const p = d.products[Math.floor(rand() * d.products.length)];
        if (used.has(p.id)) continue;
        used.add(p.id);
        lines.push({ product: p, quantity: 1 + Math.floor(rand() * 3) });
      }
      let at = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, 8 + Math.floor(rand() * 9), Math.floor(rand() * 60));
      if (at > now) at = new Date(now.getTime() - (i + 1) * 60000);
      d.transactions.push(makeTrx(d.users[(i + back) % 2], lines, at, d.seq++));
    }
  }
  return d;
}

async function load() {
  if (db) return db;
  db = await kv.get(KEY);
  if (!db) {
    db = buildSeed();
    await save();
  }
  return db;
}
const save = () => kv.set(KEY, db);

const withCategory = (d, p) => ({ ...p, category: d.categories.find((c) => c.id === p.categoryId) || null });
const hydrate = (d, t) => {
  const u = d.users.find((x) => x.id === t.userId);
  return {
    ...t,
    user: u ? { name: u.name, username: u.username } : null,
    details: t.details.map((x) => {
      const p = d.products.find((y) => y.id === x.productId);
      return { ...x, product: { productName: p?.productName || '(produk dihapus)', barcode: p?.barcode || null } };
    }),
  };
};

function cleanProduct(d, data, ignoreId) {
  const productName = (data.productName || '').trim();
  if (!productName) throw fail('Nama produk wajib diisi', 422);
  if (!d.categories.some((c) => c.id === data.categoryId)) throw fail('Kategori tidak valid', 422);
  const costPrice = Number(data.costPrice);
  const sellingPrice = Number(data.sellingPrice);
  const stock = Number(data.stock);
  if (!(costPrice >= 0) || !(sellingPrice >= 0)) throw fail('Harga harus berupa angka 0 atau lebih', 422);
  if (!Number.isInteger(stock) || stock < 0) throw fail('Stok harus bilangan bulat 0 atau lebih', 422);
  const barcode = (data.barcode || '').trim() || null;
  if (barcode && d.products.some((p) => p.barcode === barcode && p.id !== ignoreId)) throw fail('Barcode sudah dipakai produk lain', 409);
  return { categoryId: data.categoryId, barcode, productName, costPrice, sellingPrice, stock };
}

function cleanCategory(d, data, ignoreId) {
  const name = (data.categoryName || '').trim();
  if (!name) throw fail('Nama kategori wajib diisi', 422);
  if (d.categories.some((c) => c.categoryName.toLowerCase() === name.toLowerCase() && c.id !== ignoreId)) throw fail('Nama kategori sudah ada', 409);
  return name;
}

export const mock = {
  setUser(u) {
    currentUser = u;
  },

  async login(username, password) {
    const d = await load();
    const u = d.users.find((x) => x.username === username && x.password === password);
    if (!u) throw fail('Username atau password salah', 401);
    const { password: _pw, ...user } = u;
    return { token: `mock-${u.id}`, user };
  },
  async me() {
    return currentUser;
  },

  async listCategories() {
    const d = await load();
    return d.categories
      .map((c) => ({ ...c, productCount: d.products.filter((p) => p.categoryId === c.id).length }))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  },
  async createCategory({ categoryName }) {
    const d = await load();
    const c = { id: `c${Date.now()}`, categoryName: cleanCategory(d, { categoryName }) };
    d.categories.push(c);
    await save();
    return c;
  },
  async updateCategory(id, { categoryName }) {
    const d = await load();
    const c = d.categories.find((x) => x.id === id);
    if (!c) throw fail('Kategori tidak ditemukan', 404);
    c.categoryName = cleanCategory(d, { categoryName }, id);
    await save();
    return c;
  },
  async deleteCategory(id) {
    const d = await load();
    if (d.products.some((p) => p.categoryId === id)) throw fail('Kategori masih dipakai oleh produk', 409);
    d.categories = d.categories.filter((c) => c.id !== id);
    await save();
    return null;
  },

  async listProducts({ search, categoryId } = {}) {
    const d = await load();
    const q = (search || '').trim().toLowerCase();
    return d.products
      .filter((p) => (!categoryId || p.categoryId === categoryId) && (!q || p.productName.toLowerCase().includes(q) || (p.barcode || '').includes(q)))
      .sort((a, b) => a.productName.localeCompare(b.productName))
      .map((p) => withCategory(d, p));
  },
  async getProductByBarcode(code) {
    const d = await load();
    const p = d.products.find((x) => x.barcode === code);
    if (!p) throw fail(`Produk dengan barcode ${code} tidak ditemukan`, 404);
    return withCategory(d, p);
  },
  async createProduct(data) {
    const d = await load();
    const p = { id: `p${Date.now()}`, ...cleanProduct(d, data) };
    d.products.push(p);
    await save();
    return withCategory(d, p);
  },
  async updateProduct(id, data) {
    const d = await load();
    const p = d.products.find((x) => x.id === id);
    if (!p) throw fail('Produk tidak ditemukan', 404);
    Object.assign(p, cleanProduct(d, data, id));
    await save();
    return withCategory(d, p);
  },
  async deleteProduct(id) {
    const d = await load();
    if (d.transactions.some((t) => t.details.some((x) => x.productId === id))) throw fail('Produk sudah pernah terjual sehingga tidak bisa dihapus', 409);
    d.products = d.products.filter((p) => p.id !== id);
    await save();
    return null;
  },

  async checkout({ items, paymentAmount }) {
    const d = await load();
    if (!items?.length) throw fail('Keranjang masih kosong', 422);
    const merged = new Map();
    items.forEach((i) => merged.set(i.productId, (merged.get(i.productId) || 0) + Number(i.quantity)));
    const lines = [];
    let total = 0;
    for (const [pid, quantity] of merged) {
      const product = d.products.find((x) => x.id === pid);
      if (!product) throw fail('Ada produk yang tidak ditemukan', 404);
      if (product.stock < quantity) throw fail(`Stok ${product.productName} tidak cukup (sisa ${product.stock})`, 409);
      lines.push({ product, quantity });
      total += product.sellingPrice * quantity;
    }
    const pay = Number(paymentAmount);
    if (!(pay >= total)) throw fail('Uang pembayaran kurang dari total belanja');
    lines.forEach((l) => {
      l.product.stock -= l.quantity;
    });
    const t = makeTrx(currentUser, lines, new Date(), d.seq++, pay);
    d.transactions.push(t);
    await save();
    return hydrate(d, t);
  },
  async myTransactions() {
    const d = await load();
    const start = startOfDay();
    return d.transactions
      .filter((t) => t.userId === currentUser?.id && new Date(t.createdAt) >= start)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((t) => hydrate(d, t));
  },

  async dashboard() {
    const d = await load();
    const start = startOfDay();
    const today = d.transactions.filter((t) => new Date(t.createdAt) >= start);
    const low = d.products.filter((p) => p.stock < LOW_STOCK).sort((a, b) => a.stock - b.stock);
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate() - i);
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1);
      last7Days.push({ date: ymd(s), revenue: sum(d.transactions.filter((t) => new Date(t.createdAt) >= s && new Date(t.createdAt) < e)) });
    }
    return {
      todayRevenue: sum(today),
      todayTransactions: today.length,
      lowStockCount: low.length,
      lowStockProducts: low.slice(0, 10).map((p) => withCategory(d, p)),
      last7Days,
    };
  },
  async reportTransactions({ period = 'daily', date } = {}) {
    const d = await load();
    const { from, to } = rangeFor(period, date ? parseYmd(date) : new Date());
    const items = d.transactions
      .filter((t) => new Date(t.createdAt) >= from && new Date(t.createdAt) < to)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((t) => hydrate(d, t));
    return { period, from: from.toISOString(), to: to.toISOString(), summary: { count: items.length, revenue: sum(items) }, items };
  },
};
