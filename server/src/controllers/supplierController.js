import { z } from 'zod';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const schema = z.object({
  name: z.string().trim().min(1, 'Nama supplier wajib diisi').max(150),
  phone: z.string().trim().max(30).nullish().transform((v) => (v ? v : null)),
  address: z.string().trim().max(500).nullish().transform((v) => (v ? v : null)),
  note: z.string().trim().max(500).nullish().transform((v) => (v ? v : null)),
});

export const list = asyncHandler(async (_req, res) => {
  const rows = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { purchases: true } } },
  });
  res.json({ success: true, data: rows });
});

export const create = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  try {
    const row = await prisma.supplier.create({ data });
    res.status(201).json({ success: true, data: { ...row, _count: { purchases: 0 } } });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Nama supplier sudah dipakai');
    throw e;
  }
});

export const update = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  try {
    const row = await prisma.supplier.update({
      where: { id: req.params.id },
      data,
      include: { _count: { select: { purchases: true } } },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.code === 'P2025') throw new ApiError(404, 'Supplier tidak ditemukan');
    if (e.code === 'P2002') throw new ApiError(409, 'Nama supplier sudah dipakai');
    throw e;
  }
});

export const remove = asyncHandler(async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
  } catch (e) {
    if (e.code === 'P2025') throw new ApiError(404, 'Supplier tidak ditemukan');
    if (e.code === 'P2003') throw new ApiError(409, 'Supplier masih punya nota pembelian sehingga tidak bisa dihapus');
    throw e;
  }
  res.json({ success: true, data: null });
});
