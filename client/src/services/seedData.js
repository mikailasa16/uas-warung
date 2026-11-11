// Data dummy untuk MODE DEMO OFFLINE (dipakai saat server/database belum menyala).
export const SEED_USERS = [
  { id: 'u-admin', username: 'admin', password: 'password123', name: 'Pemilik Warung', role: 'admin' },
  { id: 'u-kasir', username: 'kasir', password: 'password123', name: 'Kasir Warung', role: 'operator' },
];

export const SEED_CATEGORIES = [
  { id: 'c1', categoryName: 'Sembako' },
  { id: 'c2', categoryName: 'Makanan Instan' },
  { id: 'c3', categoryName: 'Minuman' },
  { id: 'c4', categoryName: 'Jajanan' },
  { id: 'c5', categoryName: 'Kebutuhan Rumah' },
];

// [categoryId, barcode, nama, harga beli, harga jual, stok]
export const SEED_PRODUCTS = [
  ['c1', '8990001001', 'Beras Premium 5kg', 62000, 68000, 20],
  ['c1', '8990001002', 'Minyak Goreng 1L', 16500, 18500, 3],
  ['c1', '8990001003', 'Gula Pasir 1kg', 14000, 16000, 25],
  ['c1', '8990001004', 'Telur Ayam 1kg', 26000, 29000, 12],
  ['c1', '8990001005', 'Tepung Terigu 1kg', 10000, 12000, 4],
  ['c2', '8990002001', 'Indomie Goreng', 2800, 3500, 80],
  ['c2', '8990002002', 'Indomie Soto', 2700, 3400, 60],
  ['c2', '8990002003', 'Sarden ABC 155g', 9500, 11500, 15],
  ['c3', '8990003001', 'Air Mineral 600ml', 2500, 3500, 48],
  ['c3', '8990003002', 'Teh Botol Sosro 450ml', 4500, 6000, 24],
  ['c3', '8990003003', 'Kopi Kapal Api Sachet', 1200, 1500, 100],
  ['c3', '8990003004', 'Susu Kental Manis', 9000, 11000, 2],
  ['c3', '8990003005', 'Teh Celup Sariwangi', 6500, 8000, 18],
  ['c4', '8990004001', 'Chitato Sapi Panggang', 8500, 10500, 30],
  ['c4', '8990004002', 'Oreo Vanila', 7000, 9000, 22],
  ['c4', '8990004003', 'Permen Kopiko', 1800, 2500, 40],
  ['c5', '8990005001', 'Sabun Mandi Lifebuoy', 3000, 4000, 36],
  ['c5', '8990005002', 'Deterjen Rinso 800g', 18000, 21000, 4],
  ['c5', '8990005003', 'Pasta Gigi Pepsodent', 9000, 11500, 14],
].map(([categoryId, barcode, productName, costPrice, sellingPrice, stock], i) => ({
  id: `p${i + 1}`,
  categoryId,
  barcode,
  productName,
  costPrice,
  sellingPrice,
  stock,
}));
