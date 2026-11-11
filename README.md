# Warung POS

Aplikasi kasir & stok untuk warung kelontong. Berjalan di **Web, Android, dan iOS** (satu kode, Expo).

- `server/` : Node.js + Express + Prisma + **MySQL** (JWT + RBAC)
- `client/` : React Native (Expo Router) + React Native Web

## Akun uji coba
| Peran | Username | Password |
|-------|----------|----------|
| Admin (pemilik) | `admin` | `password123` |
| Operator (kasir) | `kasir` | `password123` |

## Cara menjalankan (Windows / PowerShell, dari folder ini)

### 1. Nyalakan MySQL
XAMPP -> klik **Start** pada MySQL. (Konfigurasi bawaan `server/.env`: user `root`, tanpa password.
Jika MySQL Anda memakai password, ubah `DATABASE_URL` di `server/.env`.)

### 2. Pasang dependensi (sekali saja)
```powershell
npm run install:all
```

### 3. Buat tabel + isi data dummy (sekali saja)
```powershell
npm run setup:db
```
Database `warung_pos` dibuat otomatis. Berisi 2 akun, 5 kategori, 19 produk, dan transaksi 7 hari terakhir.

### 4. Jalankan (butuh 2 terminal)
```powershell
npm run server     # terminal 1 -> http://localhost:4000/api/health
npm run web        # terminal 2 -> buka http://localhost:8081
```
HP (Android/iOS): `npm run mobile`, lalu scan QR dengan Expo Go (HP & laptop satu WiFi).
Izinkan Node.js di Windows Firewall (jaringan privat) agar HP bisa menjangkau server port 4000.

### Mode Demo Offline
Jika server/MySQL belum menyala saat login, aplikasi otomatis memakai **data demo di perangkat**
(ditandai "MODE DEMO OFFLINE") sehingga seluruh fitur tetap bisa dicoba. Data demo tidak masuk MySQL.

## Fitur
- Login JWT, tampilan & rute dibatasi per peran (kasir hanya melihat menu Kasir)
- Kategori & Produk: tambah/ubah/hapus, cari nama/barcode, filter kategori, badge stok menipis (< 5)
- Kasir: grid produk, cari, input/simulasi scan barcode, keranjang, bayar tunai + kembalian otomatis,
  stok berkurang otomatis, struk (cetak / simpan PDF)
- Dashboard: omzet hari ini, jumlah transaksi, stok menipis, grafik 7 hari
- Laporan: filter harian/bulanan, rincian barang per transaksi

## Deploy ke AWS EC2 (ringkas)
- Salin `server/.env.example` menjadi `server/.env`; isi `DATABASE_URL` (RDS), `JWT_SECRET` acak, `CORS_ORIGINS` (URL web), `NODE_ENV=production`
- Set zona waktu server: `TZ=Asia/Jakarta`
- `npm --prefix server run setup` lalu `npm --prefix server start` (disarankan pakai pm2 + nginx/HTTPS)
- Web: set `EXPO_PUBLIC_API_URL` lalu `npx expo export --platform web`

## Catatan versi Expo
`client/package.json` memakai Expo SDK 53. Jika versi Expo Go di HP Anda lebih baru dan menolak proyek,
jalankan di folder `client`: `npx expo install expo@latest --fix`. Versi web tidak terpengaruh.
