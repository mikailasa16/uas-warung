import { z } from 'zod';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const schema = z.object({
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  barcode: z.string().trim().max(50).nullish().transform((v) => (v ? v : null)),
  productName: z.string().trim().min(1, 'Nama produk wajib diisi').max(150),
  costPrice: z.coerce.number({ invalid_type_error: 'Harga beli harus angka' }).min(0, 'Harga beli tidak boleh negatif'),
  sellingPrice: z.coerce.number({ invalid_type_error: 'Harga jual harus angka' }).min(0, 'Harga jual tidak boleh negatif'),
  stock: z.coerce.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif'),
});

// Operator (kasir) tidak boleh melihat harga beli.
const present = (p, role) => {
  if (role === 'admin') return p;
  const { costPrice, ...rest } = p;
  return rest;
};

export const list = asyncHandler(async (req, res) => {
  const { search, categoryId } = req.query;
  const where = {};
  if (categoryId) where.categoryId = String(categoryId);
  if (search) {
    const q = String(search).trim();
    where.OR = [{ productName: { contains: q } }, { barcode: { contains: q } }];
  }
  const rows = await prisma.product.findMany({ where, orderBy: { productName: 'asc' }, include: { category: true } });
  res.json({ success: true, data: rows.map((p) => present(p, req.user.role)) });
});

export const getByBarcode = asyncHandler(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { barcode: req.params.code }, include: { category: true } });
  if (!p) throw new ApiError(404, `Produk dengan barcode ${req.params.code} tidak ditemukan`);
  res.json({ success: true, data: present(p, req.user.role) });
});

export const create = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const p = await prisma.product.create({ data, include: { category: true } });
  res.status(201).json({ success: true, data: p });
});

export const update = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const p = await prisma.product.update({ where: { id: req.params.id }, data, include: { category: true } });
  res.json({ success: true, data: p });
});

export const remove = asyncHandler(async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
  } catch (e) {
    if (e.code === 'P2003') throw new ApiError(409, 'Produk sudah pernah terjual sehingga tidak bisa dihapus');
    throw e;
  }
  res.json({ success: true, data: null });
});
