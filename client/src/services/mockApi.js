// Backend palsu di perangkat (disimpan di AsyncStorage/localStorage) - perilakunya meniru server asli.
import { kv } from './storage';
import { SEED_USERS, SEED_CATEGORIES, SEED_PRODUCTS, SEED_SUPPLIERS } from './seedData';
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
    suppliers: SEED_SUPPLIERS.map((s) => ({ ...s })),
    transactions: [],
    purchases: [],
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
  } else {
    // Data lama (sebelum ada fitur pembelian) tetap dipakai, hanya dilengkapi bagian baru.
    let changed = false;
    if (!db.suppliers) { db.suppliers = SEED_SUPPLIERS.map((s) => ({ ...s })); changed = true; }
    if (!db.purchases) { db.purchases = []; changed = true; }
    if (changed) await save();
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

const hydratePurchase = (d, p) => {
  const supplier = d.suppliers.find((s) => s.id === p.supplierId) || null;
  const user = d.users.find((u) => u.id === p.userId) || null;
  return {
    ...p,
    supplier: supplier ? { ...supplier } : null,
    user: user ? { name: user.name, username: user.username } : null,
    items: p.items.map((it) => {
      const product = it.productId ? d.products.find((x) => x.id === it.productId) : null;
      return {
        ...it,
        product: product
          ? { id: product.id, productName: product.productName, barcode: product.barcode, stock: product.stock }
          : null,
      };
    }),
  };
};

function nextPurchaseNumber(d, at = new Date()) {
  const prefix = `PB-${ymd(at).replace(/-/g, '')}`;
  let n = d.purchases.filter((p) => p.purchaseNumber.startsWith(prefix)).length + 1;
  let number = `${prefix}-${String(n).padStart(4, '0')}`;
  while (d.purchases.some((p) => p.purchaseNumber === number)) {
    n += 1;
    number = `${prefix}-${String(n).padStart(4, '0')}`;
  }
  return number;
}

function cleanPurchaseItems(d, rawItems) {
  if (!rawItems?.length) throw fail('Tambahkan minimal satu barang', 422);

  const barcodes = rawItems.filter((i) => !i.productId && i.newBarcode).map((i) => String(i.newBarcode).trim());
  if (new Set(barcodes).size !== barcodes.length) throw fail('Ada barcode yang sama pada barang baru', 409);
  for (const code of barcodes) {
    if (d.products.some((p) => p.barcode === code)) throw fail(`Barcode ${code} sudah dipakai produk lain`, 409);
  }

  return rawItems.map((it, i) => {
    const quantity = Number(it.quantity);
    const unitCost = Number(it.unitCost);
    if (!Number.isInteger(quantity) || quantity < 1) throw fail('Jumlah minimal 1', 422);
    if (!(unitCost >= 0)) throw fail('Harga beli tidak valid', 422);
    const subtotal = Math.round(unitCost * quantity * 100) / 100;

    if (it.productId) {
      const product = d.products.find((p) => p.id === it.productId);
      if (!product) throw fail('Produk tidak ditemukan', 404);
      return {
        id: `pi${Date.now()}-${i}`,
        productId: product.id,
        productName: product.productName,
        quantity,
        unitCost,
        subtotal,
        isNewProduct: false,
        newCategoryId: null,
        newSellingPrice: null,
        newBarcode: null,
      };
    }

    const productName = String(it.productName || '').trim();
    if (!productName) throw fail('Nama barang baru wajib diisi', 422);
    if (!d.categories.some((c) => c.id === it.newCategoryId)) throw fail('Kategori barang baru wajib dipilih', 422);
    const newSellingPrice = Number(it.newSellingPrice);
    if (!(newSellingPrice >= 0)) throw fail('Harga jual barang baru wajib diisi', 422);

    return {
      id: `pi${Date.now()}-${i}`,
      productId: null,
      productName,
      quantity,
      unitCost,
      subtotal,
      isNewProduct: true,
      newCategoryId: it.newCategoryId,
      newSellingPrice,
      newBarcode: (it.newBarcode || '').trim() || null,
    };
  });
}

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
    if (d.purchases.some((p) => p.status !== 'diterima' && p.status !== 'batal' && p.items.some((i) => i.newCategoryId === id)))
      throw fail('Kategori masih dipakai pada nota pembelian yang belum diterima', 409);
    d.categories = d.categories.filter((c) => c.id !== id);
    await save();
    return null;
  },

  async listSuppliers() {
    const d = await load();
    return d.suppliers
      .map((s) => ({ ...s, _count: { purchases: d.purchases.filter((p) => p.supplierId === s.id).length } }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  async createSupplier({ name, phone, address, note } = {}) {
    const d = await load();
    const clean = String(name || '').trim();
    if (!clean) throw fail('Nama supplier wajib diisi', 422);
    if (d.suppliers.some((s) => s.name.toLowerCase() === clean.toLowerCase())) throw fail('Nama supplier sudah dipakai', 409);
    const row = {
      id: `s${Date.now()}`,
      name: clean,
      phone: String(phone || '').trim() || null,
      address: String(address || '').trim() || null,
      note: String(note || '').trim() || null,
    };
    d.suppliers.push(row);
    await save();
    return { ...row, _count: { purchases: 0 } };
  },
  async updateSupplier(id, { name, phone, address, note } = {}) {
    const d = await load();
    const row = d.suppliers.find((s) => s.id === id);
    if (!row) throw fail('Supplier tidak ditemukan', 404);
    const clean = String(name || '').trim();
    if (!clean) throw fail('Nama supplier wajib diisi', 422);
    if (d.suppliers.some((s) => s.id !== id && s.name.toLowerCase() === clean.toLowerCase())) throw fail('Nama supplier sudah dipakai', 409);
    row.name = clean;
    row.phone = String(phone || '').trim() || null;
    row.address = String(address || '').trim() || null;
    row.note = String(note || '').trim() || null;
    await save();
    return { ...row, _count: { purchases: d.purchases.filter((p) => p.supplierId === row.id).length } };
  },
  async deleteSupplier(id) {
    const d = await load();
    if (!d.suppliers.some((s) => s.id === id)) throw fail('Supplier tidak ditemukan', 404);
    if (d.purchases.some((p) => p.supplierId === id)) throw fail('Supplier masih punya nota pembelian sehingga tidak bisa dihapus', 409);
    d.suppliers = d.suppliers.filter((s) => s.id !== id);
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

  async listPurchases({ status, supplierId, search } = {}) {
    const d = await load();
    const q = (search || '').trim().toLowerCase();
    return d.purchases
      .filter((p) => (!status || p.status === status) && (!supplierId || p.supplierId === supplierId))
      .filter((p) => {
        if (!q) return true;
        const supplier = d.suppliers.find((s) => s.id === p.supplierId);
        return p.purchaseNumber.toLowerCase().includes(q) || (supplier?.name || '').toLowerCase().includes(q);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => hydratePurchase(d, p));
  },
  async getPurchase(id) {
    const d = await load();
    const p = d.purchases.find((x) => x.id === id);
    if (!p) throw fail('Nota pembelian tidak ditemukan', 404);
    return hydratePurchase(d, p);
  },
  async createPurchase(data) {
    const d = await load();
    if (data.supplierId && !d.suppliers.some((s) => s.id === data.supplierId)) throw fail('Supplier tidak ditemukan', 404);
    const items = cleanPurchaseItems(d, data.items);
    const status = data.status === 'draft' ? 'draft' : 'dipesan';
    const now = new Date();
    const row = {
      id: `pur${Date.now()}`,
      purchaseNumber: nextPurchaseNumber(d, now),
      supplierId: data.supplierId || null,
      userId: currentUser?.id || d.users[0].id,
      status,
      totalAmount: items.reduce((s, i) => s + i.subtotal, 0),
      note: String(data.note || '').trim() || null,
      orderedAt: status === 'dipesan' ? now.toISOString() : null,
      receivedAt: null,
      createdAt: now.toISOString(),
      items,
    };
    d.purchases.push(row);
    await save();
    return hydratePurchase(d, row);
  },
  async updatePurchase(id, data) {
    const d = await load();
    const row = d.purchases.find((x) => x.id === id);
    if (!row) throw fail('Nota pembelian tidak ditemukan', 404);
    if (row.status === 'diterima' || row.status === 'batal') throw fail('Nota yang sudah diterima atau dibatalkan tidak bisa diubah', 409);
    if (data.supplierId && !d.suppliers.some((s) => s.id === data.supplierId)) throw fail('Supplier tidak ditemukan', 404);
    const items = cleanPurchaseItems(d, data.items);
    row.supplierId = data.supplierId || null;
    row.items = items;
    row.totalAmount = items.reduce((s, i) => s + i.subtotal, 0);
    row.note = String(data.note || '').trim() || null;
    if (data.status === 'draft') {
      row.status = 'draft';
      row.orderedAt = null;
    } else {
      row.status = 'dipesan';
      row.orderedAt = row.orderedAt || new Date().toISOString();
    }
    await save();
    return hydratePurchase(d, row);
  },
  async receivePurchase(id) {
    const d = await load();
    const row = d.purchases.find((x) => x.id === id);
    if (!row) throw fail('Nota pembelian tidak ditemukan', 404);
    if (row.status === 'diterima') throw fail('Nota ini sudah diterima sebelumnya', 409);
    if (row.status === 'batal') throw fail('Nota ini sudah dibatalkan', 409);

    // Validasi dulu agar stok tidak berubah setengah jalan jika ada data bermasalah.
    for (const item of row.items) {
      if (item.productId) {
        if (!d.products.some((p) => p.id === item.productId)) throw fail('Produk tidak ditemukan', 404);
      } else {
        if (item.newBarcode && d.products.some((p) => p.barcode === item.newBarcode)) throw fail(`Barcode ${item.newBarcode} sudah dipakai produk lain`, 409);
        if (!d.categories.some((c) => c.id === item.newCategoryId)) throw fail('Kategori barang baru tidak valid', 422);
      }
    }

    row.items.forEach((item, i) => {
      if (item.productId) {
        const product = d.products.find((p) => p.id === item.productId);
        product.stock += item.quantity;
        product.costPrice = item.unitCost;
      } else {
        const product = {
          id: `p${Date.now()}-${i}`,
          categoryId: item.newCategoryId,
          barcode: item.newBarcode,
          productName: item.productName,
          costPrice: item.unitCost,
          sellingPrice: item.newSellingPrice ?? item.unitCost,
          stock: item.quantity,
        };
        d.products.push(product);
        item.productId = product.id;
      }
    });

    row.status = 'diterima';
    row.receivedAt = new Date().toISOString();
    await save();
    return hydratePurchase(d, row);
  },
  async cancelPurchase(id) {
    const d = await load();
    const row = d.purchases.find((x) => x.id === id);
    if (!row) throw fail('Nota pembelian tidak ditemukan', 404);
    if (row.status === 'diterima') throw fail('Nota yang sudah diterima tidak bisa dibatalkan', 409);
    row.status = 'batal';
    await save();
    return hydratePurchase(d, row);
  },
  async deletePurchase(id) {
    const d = await load();
    const row = d.purchases.find((x) => x.id === id);
    if (!row) throw fail('Nota pembelian tidak ditemukan', 404);
    if (row.status === 'diterima') throw fail('Nota yang sudah diterima tidak bisa dihapus', 409);
    d.purchases = d.purchases.filter((x) => x.id !== id);
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
