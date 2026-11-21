// Resolver GraphQL. Memakai Prisma, JWT, dan aturan peran yang sama dengan REST API.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { Prisma } from '@prisma/client';
import { z, ZodError } from 'zod';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { LOW_STOCK, parseYmd, startOfDay, ymd } from '../../utils/dates.js';

/* ---------- Penanganan error ---------- */
const CODES = { 400: 'BAD_USER_INPUT', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 422: 'BAD_USER_INPUT' };

function toGqlError(e) {
  if (e instanceof GraphQLError) return e;
  let status = e.status || 500;
  let message = e.message || 'Terjadi kesalahan pada server';
  if (e instanceof ZodError) {
    status = 422;
    message = e.issues[0]?.message || 'Data tidak valid';
  } else if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') { status = 409; message = 'Data dengan nilai yang sama sudah ada'; }
    else if (e.code === 'P2025') { status = 404; message = 'Data tidak ditemukan'; }
    else if (e.code === 'P2003') { status = 409; message = 'Data masih dipakai data lain sehingga tidak bisa dihapus'; }
  }
  if (status >= 500) {
    console.error(e);
    if (env.NODE_ENV === 'production') message = 'Terjadi kesalahan pada server';
  }
  return new GraphQLError(message, { extensions: { code: CODES[status] || 'INTERNAL_SERVER_ERROR', status } });
}

const wrap = (fn) => async (parent, args, ctx, info) => {
  try {
    return await fn(parent, args, ctx, info);
  } catch (e) {
    throw toGqlError(e);
  }
};

/* ---------- Autentikasi & peran (RBAC) ---------- */
const requireAuth = (ctx) => {
  if (!ctx.user) throw new ApiError(401, 'Silakan login terlebih dahulu');
  return ctx.user;
};
const requireAdmin = (ctx) => {
  const u = requireAuth(ctx);
  if (u.role !== 'admin') throw new ApiError(403, 'Anda tidak punya akses ke fitur ini');
  return u;
};

/* ---------- Validasi input ---------- */
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});
const categorySchema = z.object({ categoryName: z.string().trim().min(1, 'Nama kategori wajib diisi').max(100) });
const productSchema = z.object({
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  barcode: z.string().trim().max(50).nullish().transform((v) => (v ? v : null)),
  productName: z.string().trim().min(1, 'Nama produk wajib diisi').max(150),
  costPrice: z.number().min(0, 'Harga beli tidak boleh negatif'),
  sellingPrice: z.number().min(0, 'Harga jual tidak boleh negatif'),
  stock: z.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif'),
});
const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1, 'Jumlah minimal 1') })).min(1, 'Keranjang masih kosong'),
  paymentAmount: z.number().min(0, 'Uang pembayaran tidak valid'),
});
const reportSchema = z.object({
  period: z.enum(['daily', 'monthly']).default('daily'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').nullish(),
});

const trxInclude = {
  user: true,
  details: { include: { product: { include: { category: true } } } },
};
const sum = (rows) => rows.reduce((s, r) => s + Number(r.totalAmount), 0);

const makeNumber = () => {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  return `TRX-${ymd(d).replace(/-/g, '')}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}-${Math.floor(Math.random() * 9000 + 1000)}`;
};

export const resolvers = {
  Query: {
    health: () => 'ok',

    me: wrap(async (_p, _a, ctx) => {
      const u = requireAuth(ctx);
      const user = await prisma.user.findUnique({ where: { id: u.id } });
      if (!user) throw new ApiError(401, 'Akun tidak ditemukan');
      return user;
    }),

    categories: wrap(async (_p, _a, ctx) => {
      requireAuth(ctx);
      const rows = await prisma.category.findMany({
        orderBy: { categoryName: 'asc' },
        include: { _count: { select: { products: true } } },
      });
      return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
    }),

    products: wrap(async (_p, { search, categoryId }, ctx) => {
      requireAuth(ctx);
      const where = {};
      if (categoryId) where.categoryId = categoryId;
      if (search && search.trim()) {
        const q = search.trim();
        where.OR = [{ productName: { contains: q } }, { barcode: { contains: q } }];
      }
      return prisma.product.findMany({ where, orderBy: { productName: 'asc' }, include: { category: true } });
    }),

    productByBarcode: wrap(async (_p, { barcode }, ctx) => {
      requireAuth(ctx);
      const p = await prisma.product.findUnique({ where: { barcode }, include: { category: true } });
      if (!p) throw new ApiError(404, `Produk dengan barcode ${barcode} tidak ditemukan`);
      return p;
    }),

    myTransactions: wrap(async (_p, _a, ctx) => {
      const u = requireAuth(ctx);
      return prisma.transaction.findMany({
        where: { userId: u.id, createdAt: { gte: startOfDay() } },
        orderBy: { createdAt: 'desc' },
        include: trxInclude,
      });
    }),

    dashboard: wrap(async (_p, _a, ctx) => {
      requireAdmin(ctx);
      const start = startOfDay();
      const weekStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 6);
      const [week, lowStockCount, lowStockProducts] = await Promise.all([
        prisma.transaction.findMany({ where: { createdAt: { gte: weekStart } }, select: { totalAmount: true, createdAt: true } }),
        prisma.product.count({ where: { stock: { lt: LOW_STOCK } } }),
        prisma.product.findMany({ where: { stock: { lt: LOW_STOCK } }, orderBy: { stock: 'asc' }, take: 10, include: { category: true } }),
      ]);
      const today = week.filter((t) => t.createdAt >= start);
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const s = new Date(start.getFullYear(), start.getMonth(), start.getDate() - i);
        const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1);
        last7Days.push({ date: ymd(s), revenue: sum(week.filter((t) => t.createdAt >= s && t.createdAt < e)) });
      }
      return { todayRevenue: sum(today), todayTransactions: today.length, lowStockCount, lowStockProducts, last7Days };
    }),

    report: wrap(async (_p, args, ctx) => {
      requireAdmin(ctx);
      const { period, date } = reportSchema.parse({ period: args.period ?? undefined, date: args.date });
      const base = date ? parseYmd(date) : new Date();
      const from = period === 'monthly' ? new Date(base.getFullYear(), base.getMonth(), 1) : startOfDay(base);
      const to =
        period === 'monthly'
          ? new Date(base.getFullYear(), base.getMonth() + 1, 1)
          : new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
      const items = await prisma.transaction.findMany({
        where: { createdAt: { gte: from, lt: to } },
        orderBy: { createdAt: 'desc' },
        include: trxInclude,
      });
      return { period, from: from.toISOString(), to: to.toISOString(), summary: { count: items.length, revenue: sum(items) }, items };
    }),
  },

  Mutation: {
    login: wrap(async (_p, args) => {
      const { username, password } = loginSchema.parse(args);
      const user = await prisma.user.findUnique({ where: { username } });
      const ok = user && (await bcrypt.compare(password, user.passwordHash));
      if (!ok) throw new ApiError(401, 'Username atau password salah');
      const token = jwt.sign({ role: user.role, username: user.username }, env.JWT_SECRET, {
        subject: user.id,
        expiresIn: env.JWT_EXPIRES_IN,
      });
      return { token, user };
    }),

    createCategory: wrap(async (_p, args, ctx) => {
      requireAdmin(ctx);
      return prisma.category.create({ data: categorySchema.parse(args) });
    }),
    updateCategory: wrap(async (_p, args, ctx) => {
      requireAdmin(ctx);
      const data = categorySchema.parse({ categoryName: args.categoryName });
      return prisma.category.update({ where: { id: args.id }, data });
    }),
    deleteCategory: wrap(async (_p, { id }, ctx) => {
      requireAdmin(ctx);
      await prisma.category.delete({ where: { id } });
      return true;
    }),

    createProduct: wrap(async (_p, { input }, ctx) => {
      requireAdmin(ctx);
      return prisma.product.create({ data: productSchema.parse(input), include: { category: true } });
    }),
    updateProduct: wrap(async (_p, { id, input }, ctx) => {
      requireAdmin(ctx);
      return prisma.product.update({ where: { id }, data: productSchema.parse(input), include: { category: true } });
    }),
    deleteProduct: wrap(async (_p, { id }, ctx) => {
      requireAdmin(ctx);
      try {
        await prisma.product.delete({ where: { id } });
      } catch (e) {
        if (e.code === 'P2003') throw new ApiError(409, 'Produk sudah pernah terjual sehingga tidak bisa dihapus');
        throw e;
      }
      return true;
    }),

    // Harga diambil dari database (bukan dari client); stok dikurangi atomik di dalam satu transaksi database.
    checkout: wrap(async (_p, args, ctx) => {
      const user = requireAuth(ctx);
      const { items, paymentAmount } = checkoutSchema.parse(args);

      const merged = new Map();
      for (const it of items) merged.set(it.productId, (merged.get(it.productId) || 0) + it.quantity);

      return prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({ where: { id: { in: [...merged.keys()] } } });
        if (products.length !== merged.size) throw new ApiError(404, 'Ada produk yang tidak ditemukan');

        let total = 0;
        const details = [];
        for (const p of products) {
          const quantity = merged.get(p.id);
          if (p.stock < quantity) throw new ApiError(409, `Stok ${p.productName} tidak cukup (sisa ${p.stock})`);
          const unitPrice = Number(p.sellingPrice);
          const subtotal = unitPrice * quantity;
          total += subtotal;
          details.push({ productId: p.id, quantity, unitPrice, subtotal });
        }
        if (paymentAmount < total) throw new ApiError(400, 'Uang pembayaran kurang dari total belanja');

        for (const d of details) {
          const r = await tx.product.updateMany({
            where: { id: d.productId, stock: { gte: d.quantity } },
            data: { stock: { decrement: d.quantity } },
          });
          if (r.count === 0) throw new ApiError(409, 'Stok baru saja berubah, silakan coba lagi');
        }

        return tx.transaction.create({
          data: {
            transactionNumber: makeNumber(),
            userId: user.id,
            totalAmount: total,
            paymentAmount,
            changeAmount: paymentAmount - total,
            details: { create: details },
          },
          include: trxInclude,
        });
      });
    }),
  },

  /* ---------- Konversi field (Decimal -> angka, relasi) ---------- */
  Category: {
    productCount: (c) => c.productCount ?? prisma.product.count({ where: { categoryId: c.id } }),
  },
  Product: {
    // Kasir (operator) tidak boleh melihat harga beli
    costPrice: (p, _a, ctx) => (ctx.user?.role === 'admin' ? Number(p.costPrice) : null),
    sellingPrice: (p) => Number(p.sellingPrice),
    category: (p) => p.category ?? prisma.category.findUnique({ where: { id: p.categoryId } }),
  },
  Transaction: {
    totalAmount: (t) => Number(t.totalAmount),
    paymentAmount: (t) => Number(t.paymentAmount),
    changeAmount: (t) => Number(t.changeAmount),
    createdAt: (t) => new Date(t.createdAt).toISOString(),
    user: (t) => t.user ?? prisma.user.findUnique({ where: { id: t.userId } }),
    details: (t) =>
      t.details ?? prisma.transactionDetail.findMany({ where: { transactionId: t.id }, include: { product: { include: { category: true } } } }),
  },
  TransactionDetail: {
    unitPrice: (d) => Number(d.unitPrice),
    subtotal: (d) => Number(d.subtotal),
    product: (d) => d.product ?? prisma.product.findUnique({ where: { id: d.productId }, include: { category: true } }),
  },
};
