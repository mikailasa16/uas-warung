import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { LOW_STOCK, parseYmd, startOfDay, ymd } from '../utils/dates.js';
import { transactionInclude } from './transactionController.js';

const sum = (rows) => rows.reduce((s, r) => s + Number(r.totalAmount), 0);

export const dashboard = asyncHandler(async (_req, res) => {
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

  res.json({
    success: true,
    data: { todayRevenue: sum(today), todayTransactions: today.length, lowStockCount, lowStockProducts, last7Days },
  });
});

const querySchema = z.object({
  period: z.enum(['daily', 'monthly']).default('daily'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
});

export const transactions = asyncHandler(async (req, res) => {
  const { period, date } = querySchema.parse(req.query);
  const base = date ? parseYmd(date) : new Date();
  const from = period === 'monthly' ? new Date(base.getFullYear(), base.getMonth(), 1) : startOfDay(base);
  const to =
    period === 'monthly'
      ? new Date(base.getFullYear(), base.getMonth() + 1, 1)
      : new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);

  const items = await prisma.transaction.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: 'desc' },
    include: transactionInclude,
  });

  res.json({
    success: true,
    data: { period, from, to, summary: { count: items.length, revenue: sum(items) }, items },
  });
});
