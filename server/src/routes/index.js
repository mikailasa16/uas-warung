import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as auth from '../controllers/authController.js';
import * as category from '../controllers/categoryController.js';
import * as product from '../controllers/productController.js';
import * as supplier from '../controllers/supplierController.js';
import * as purchase from '../controllers/purchaseController.js';
import * as trx from '../controllers/transactionController.js';
import * as report from '../controllers/reportController.js';

const router = Router();
const admin = authorize('admin');

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

// Auth
router.post('/auth/login', auth.login);
router.get('/auth/me', authenticate, auth.me);

// Kategori (baca: semua user login; ubah: admin)
router.get('/categories', authenticate, category.list);
router.post('/categories', authenticate, admin, category.create);
router.put('/categories/:id', authenticate, admin, category.update);
router.delete('/categories/:id', authenticate, admin, category.remove);

// Produk
router.get('/products', authenticate, product.list);
router.get('/products/barcode/:code', authenticate, product.getByBarcode);
router.post('/products', authenticate, admin, product.create);
router.put('/products/:id', authenticate, admin, product.update);
router.delete('/products/:id', authenticate, admin, product.remove);

// Supplier & pembelian (khusus admin/pemilik)
router.get('/suppliers', authenticate, admin, supplier.list);
router.post('/suppliers', authenticate, admin, supplier.create);
router.put('/suppliers/:id', authenticate, admin, supplier.update);
router.delete('/suppliers/:id', authenticate, admin, supplier.remove);

router.get('/purchases', authenticate, admin, purchase.list);
router.get('/purchases/:id', authenticate, admin, purchase.detail);
router.post('/purchases', authenticate, admin, purchase.create);
router.put('/purchases/:id', authenticate, admin, purchase.update);
router.post('/purchases/:id/receive', authenticate, admin, purchase.receive);
router.post('/purchases/:id/cancel', authenticate, admin, purchase.cancel);
router.delete('/purchases/:id', authenticate, admin, purchase.remove);

// Transaksi kasir (admin & operator)
router.post('/transactions', authenticate, trx.checkout);
router.get('/transactions/mine', authenticate, trx.mine);

// Laporan (admin)
router.get('/reports/dashboard', authenticate, admin, report.dashboard);
router.get('/reports/transactions', authenticate, admin, report.transactions);

export default router;
