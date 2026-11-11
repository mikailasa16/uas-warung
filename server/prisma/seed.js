// Seed data dummy: 2 akun, kategori, produk, dan transaksi 7 hari terakhir.
// Aman dijalankan berulang kali (upsert; transaksi hanya dibuat jika tabel masih kosong).
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = ['Sembako', 'Makanan Instan', 'Minuman', 'Jajanan', 'Kebutuhan Rumah'];

// [kategori, barcode, nama, harga beli, harga jual, stok]
const PRODUCTS = [
  ['Sembako', '8990001001', 'Beras Premium 5kg', 62000, 68000, 20],
  ['Sembako', '8990001002', 'Minyak Goreng 1L', 16500, 18500, 3],
  ['Sembako', '8990001003', 'Gula Pasir 1kg', 14000, 16000, 25],
  ['Sembako', '8990001004', 'Telur Ayam 1kg', 26000, 29000, 12],
  ['Sembako', '8990001005', 'Tepung Terigu 1kg', 10000, 12000, 4],
  ['Makanan Instan', '8990002001', 'Indomie Goreng', 2800, 3500, 80],
  ['Makanan Instan', '8990002002', 'Indomie Soto', 2700, 3400, 60],
  ['Makanan Instan', '8990002003', 'Sarden ABC 155g', 9500, 11500, 15],
  ['Minuman', '8990003001', 'Air Mineral 600ml', 2500, 3500, 48],
  ['Minuman', '8990003002', 'Teh Botol Sosro 450ml', 4500, 6000, 24],
  ['Minuman', '8990003003', 'Kopi Kapal Api Sachet', 1200, 1500, 100],
  ['Minuman', '8990003004', 'Susu Kental Manis', 9000, 11000, 2],
  ['Minuman', '8990003005', 'Teh Celup Sariwangi', 6500, 8000, 18],
  ['Jajanan', '8990004001', 'Chitato Sapi Panggang', 8500, 10500, 30],
  ['Jajanan', '8990004002', 'Oreo Vanila', 7000, 9000, 22],
  ['Jajanan', '8990004003', 'Permen Kopiko', 1800, 2500, 40],
  ['Kebutuhan Rumah', '8990005001', 'Sabun Mandi Lifebuoy', 3000, 4000, 36],
  ['Kebutuhan Rumah', '8990005002', 'Deterjen Rinso 800g', 18000, 21000, 4],
  ['Kebutuhan Rumah', '8990005003', 'Pasta Gigi Pepsodent', 9000, 11500, 14],
];

const p2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  for (const [username, name, role] of [
    ['admin', 'Pemilik Warung', 'admin'],
    ['kasir', 'Kasir Warung', 'operator'],
  ]) {
    await prisma.user.upsert({ where: { username }, update: {}, create: { username, name, role, passwordHash } });
  }

  const catId = {};
  for (const categoryName of CATEGORIES) {
    const c = await prisma.category.upsert({ where: { categoryName }, update: {}, create: { categoryName } });
    catId[categoryName] = c.id;
  }

  for (const [cat, barcode, productName, costPrice, sellingPrice, stock] of PRODUCTS) {
    await prisma.product.upsert({
      where: { barcode },
      update: {},
      create: { categoryId: catId[cat], barcode, productName, costPrice, sellingPrice, stock },
    });
  }

  if ((await prisma.transaction.count()) === 0) {
    const users = await prisma.user.findMany();
    const products = await prisma.product.findMany();
    const now = new Date();
    let seq = 1;
    for (let back = 6; back >= 0; back--) {
      const n = back === 0 ? 3 : 2 + (back % 3);
      for (let i = 0; i < n; i++) {
        const picked = [...products].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 4));
        const details = picked.map((p) => {
          const quantity = 1 + Math.floor(Math.random() * 3);
          const unitPrice = Number(p.sellingPrice);
          return { productId: p.id, quantity, unitPrice, subtotal: unitPrice * quantity };
        });
        const total = details.reduce((s, d) => s + d.subtotal, 0);
        const payment = Math.ceil(total / 5000) * 5000;
        let createdAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, 8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
        if (createdAt > now) createdAt = new Date(now.getTime() - (i + 1) * 60000);
        await prisma.transaction.create({
          data: {
            transactionNumber: `TRX-${ymd(createdAt)}-SEED${String(seq++).padStart(3, '0')}`,
            userId: users[(i + back) % users.length].id,
            totalAmount: total,
            paymentAmount: payment,
            changeAmount: payment - total,
            createdAt,
            details: { create: details },
          },
        });
      }
    }
  }

  console.log('Seed selesai. Login: admin / password123  atau  kasir / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
