import { z } from 'zod';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { startOfDay, ymd } from '../utils/dates.js';

const STATUSES = ['draft', 'dipesan', 'diterima', 'batal'];

const itemSchema = z.object({
  productId: z.string().min(1).nullish(),
  productName: z.string().trim().max(150).optional(),
  quantity: z.coerce.number({ invalid_type_error: 'Jumlah harus angka' }).int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
  unitCost: z.coerce.number({ invalid_type_error: 'Harga beli harus angka' }).min(0, 'Harga beli tidak boleh negatif'),
  newCategoryId: z.string().min(1).nullish(),
  newSellingPrice: z.coerce.number({ invalid_type_error: 'Harga jual harus angka' }).min(0).nullish(),
  newBarcode: z.string().trim().max(50).nullish().transform((v) => (v ? v : null)),
});

const schema = z.object({
  supplierId: z.string().trim().max(50).nullish().transform((v) => (v ? v : null)),
  status: z.enum(['draft', 'dipesan']).optional(),
  note: z.string().trim().max(500).nullish().transform((v) => (v ? v : null)),
  items: z.array(itemSchema).min(1, 'Tambahkan minimal satu barang'),
});

const include = {
  supplier: true,
  user: { select: { name: true, username: true } },
  items: {
    orderBy: { productName: 'asc' },
    include: { product: { select: { id: true, productName: true, barcode: true, stock: true } } },
  },
};

const money = (n) => Math.round(Number(n) * 100) / 100;

// Validasi tiap baris nota: produk lama memakai produk di database, barang baru memakai data input.
async function prepareItems(tx, rawItems) {
  const productIds = [...new Set(rawItems.filter((i) => i.productId).map((i) => i.productId))];
  const products = productIds.length ? await tx.product.findMany({ where: { id: { in: productIds } } }) : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const newItems = rawItems.filter((i) => !i.productId);
  const categoryIds = [...new Set(newItems.map((i) => i.newCategoryId).filter(Boolean))];
  const categories = categoryIds.length ? await tx.category.findMany({ where: { id: { in: categoryIds } } }) : [];
  const categorySet = new Set(categories.map((c) => c.id));

  const barcodes = newItems.map((i) => i.newBarcode).filter(Boolean);
  if (new Set(barcodes).size !== barcodes.length) throw new ApiError(409, 'Ada barcode yang sama pada barang baru');
  if (barcodes.length) {
    const used = await tx.product.findFirst({ where: { barcode: { in: barcodes } } });
    if (used) throw new ApiError(409, `Barcode ${used.barcode} sudah dipakai produk lain`);
  }

  return rawItems.map((it) => {
    const quantity = it.quantity;
    const unitCost = it.unitCost;
    const subtotal = money(unitCost * quantity);

    if (it.productId) {
      const p = productMap.get(it.productId);
      if (!p) throw new ApiError(404, 'Ada produk yang tidak ditemukan');
      return { productId: p.id, productName: p.productName, quantity, unitCost, subtotal, isNewProduct: false };
    }

    const productName = (it.productName || '').trim();
    if (!productName) throw new ApiError(422, 'Nama barang baru wajib diisi');
    if (!it.newCategoryId || !categorySet.has(it.newCategoryId)) throw new ApiError(422, 'Kategori barang baru wajib dipilih');
    if (it.newSellingPrice == null) throw new ApiError(422, 'Harga jual barang baru wajib diisi');

    return {
      productId: null,
      productName,
      quantity,
      unitCost,
      subtotal,
      isNewProduct: true,
      newCategoryId: it.newCategoryId,
      newSellingPrice: it.newSellingPrice,
      newBarcode: it.newBarcode,
    };
  });
}

async function makeNumber(tx) {
  const prefix = `PB-${ymd(new Date()).replace(/-/g, '')}`;
  const from = startOfDay();
  const to = new Date(from.getTime() + 86400000);
  let n = (await tx.purchase.count({ where: { createdAt: { gte: from, lt: to } } })) + 1;
  for (;;) {
    const candidate = `${prefix}-${String(n).padStart(4, '0')}`;
    const exists = await tx.purchase.findUnique({ where: { purchaseNumber: candidate } });
    if (!exists) return candidate;
    n += 1;
  }
}

export const list = asyncHandler(async (req, res) => {
  const { status, supplierId, search } = req.query;
  const where = {};
  if (status && STATUSES.includes(String(status))) where.status = String(status);
  if (supplierId) where.supplierId = String(supplierId);
  if (search) {
    const q = String(search).trim();
    where.OR = [{ purchaseNumber: { contains: q } }, { supplier: { name: { contains: q } } }];
  }
  const rows = await prisma.purchase.findMany({ where, orderBy: { createdAt: 'desc' }, include });
  res.json({ success: true, data: rows });
});

export const detail = asyncHandler(async (req, res) => {
  const row = await prisma.purchase.findUnique({ where: { id: req.params.id }, include });
  if (!row) throw new ApiError(404, 'Nota pembelian tidak ditemukan');
  res.json({ success: true, data: row });
});

export const create = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  if (data.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new ApiError(404, 'Supplier tidak ditemukan');
  }

  const status = data.status || 'dipesan';
  const row = await prisma.$transaction(async (tx) => {
    const items = await prepareItems(tx, data.items);
    const totalAmount = money(items.reduce((s, i) => s + i.subtotal, 0));
    return tx.purchase.create({
      data: {
        purchaseNumber: await makeNumber(tx),
        supplierId: data.supplierId,
        userId: req.user.id,
        status,
        totalAmount,
        note: data.note,
        orderedAt: status === 'dipesan' ? new Date() : null,
        items: { create: items },
      },
      include,
    });
  });

  res.status(201).json({ success: true, data: row });
});

export const update = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const existing = await prisma.purchase.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Nota pembelian tidak ditemukan');
  if (existing.status === 'diterima' || existing.status === 'batal') {
    throw new ApiError(409, 'Nota yang sudah diterima atau dibatalkan tidak bisa diubah');
  }
  if (data.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new ApiError(404, 'Supplier tidak ditemukan');
  }

  const status = data.status || (existing.status === 'draft' ? 'draft' : 'dipesan');
  const row = await prisma.$transaction(async (tx) => {
    const items = await prepareItems(tx, data.items);
    const totalAmount = money(items.reduce((s, i) => s + i.subtotal, 0));
    await tx.purchaseItem.deleteMany({ where: { purchaseId: existing.id } });
    return tx.purchase.update({
      where: { id: existing.id },
      data: {
        supplierId: data.supplierId,
        status,
        totalAmount,
        note: data.note,
        orderedAt: status === 'dipesan' ? existing.orderedAt || new Date() : null,
        items: { create: items },
      },
      include,
    });
  });

  res.json({ success: true, data: row });
});

// Inti fitur: mencentang "barang sudah datang" -> stok bertambah & produk baru dibuat.
export const receive = asyncHandler(async (req, res) => {
  const row = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!purchase) throw new ApiError(404, 'Nota pembelian tidak ditemukan');
    if (purchase.status === 'diterima') throw new ApiError(409, 'Nota ini sudah diterima sebelumnya');
    if (purchase.status === 'batal') throw new ApiError(409, 'Nota ini sudah dibatalkan');

    // Klaim status lebih dulu agar dua permintaan bersamaan tidak menambah stok dua kali.
    const claimed = await tx.purchase.updateMany({
      where: { id: purchase.id, status: { in: ['draft', 'dipesan'] } },
      data: { status: 'diterima', receivedAt: new Date() },
    });
    if (claimed.count === 0) throw new ApiError(409, 'Nota ini sudah diproses');

    for (const item of purchase.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity }, costPrice: item.unitCost },
        });
      } else {
        let product;
        try {
          product = await tx.product.create({
            data: {
              categoryId: item.newCategoryId,
              barcode: item.newBarcode,
              productName: item.productName,
              costPrice: item.unitCost,
              sellingPrice: item.newSellingPrice ?? item.unitCost,
              stock: item.quantity,
            },
          });
        } catch (e) {
          if (e.code === 'P2002') throw new ApiError(409, `Barcode ${item.newBarcode} sudah dipakai produk lain`);
          throw e;
        }
        await tx.purchaseItem.update({ where: { id: item.id }, data: { productId: product.id } });
      }
    }

    return tx.purchase.findUnique({ where: { id: purchase.id }, include });
  });

  res.json({ success: true, data: row });
});

export const cancel = asyncHandler(async (req, res) => {
  const result = await prisma.purchase.updateMany({
    where: { id: req.params.id, status: { in: ['draft', 'dipesan'] } },
    data: { status: 'batal' },
  });
  if (result.count === 0) {
    const exists = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!exists) throw new ApiError(404, 'Nota pembelian tidak ditemukan');
    throw new ApiError(409, 'Nota ini tidak bisa dibatalkan');
  }
  const row = await prisma.purchase.findUnique({ where: { id: req.params.id }, include });
  res.json({ success: true, data: row });
});

export const remove = asyncHandler(async (req, res) => {
  const existing = await prisma.purchase.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Nota pembelian tidak ditemukan');
  if (existing.status === 'diterima') throw new ApiError(409, 'Nota yang sudah diterima tidak bisa dihapus');
  await prisma.purchase.delete({ where: { id: existing.id } });
  res.json({ success: true, data: null });
});
