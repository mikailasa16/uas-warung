import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const schema = z.object({ categoryName: z.string().trim().min(1, 'Nama kategori wajib diisi').max(100) });

export const list = asyncHandler(async (_req, res) => {
  const rows = await prisma.category.findMany({
    orderBy: { categoryName: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({ success: true, data: rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })) });
});

export const create = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const row = await prisma.category.create({ data });
  res.status(201).json({ success: true, data: row });
});

export const update = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const row = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: row });
});

export const remove = asyncHandler(async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: null });
});
