import { z } from 'zod';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { startOfDay, ymd } from '../utils/dates.js';

const checkoutSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1') }))
    .min(1, 'Keranjang masih kosong'),
  paymentAmount: z.coerce.number({ invalid_type_error: 'Uang pembayaran harus angka' }).min(0),
});

const include = {
  user: { select: { name: true, username: true } },
  details: { include: { product: { select: { productName: true, barcode: true } } } },
};

const makeNumber = () => {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `TRX-${ymd(d).replace(/-/g, '')}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}-${rand}`;
};

// Checkout: harga selalu diambil dari database (bukan dari client), stok dikurangi secara atomik.
export const checkout = asyncHandler(async (req, res) => {
  const { items, paymentAmount } = checkoutSchema.parse(req.body);

  const merged = new Map();
  for (const it of items) merged.set(it.productId, (merged.get(it.productId) || 0) + it.quantity);

  const trx = await prisma.$transaction(async (tx) => {
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
        userId: req.user.id,
        totalAmount: total,
        paymentAmount,
        changeAmount: paymentAmount - total,
        details: { create: details },
      },
      include,
    });
  });

  res.status(201).json({ success: true, data: trx });
});

// Riwayat transaksi milik user yang login, hari ini (sesi kerja saat ini).
export const mine = asyncHandler(async (req, res) => {
  const rows = await prisma.transaction.findMany({
    where: { userId: req.user.id, createdAt: { gte: startOfDay() } },
    orderBy: { createdAt: 'desc' },
    include,
  });
  res.json({ success: true, data: rows });
});

export { include as transactionInclude };
