// Client untuk backend Express + MySQL.
import axios from 'axios';
import { getApiUrl } from './config';
import { tokenStorage } from './storage';

export const API_URL = getApiUrl();
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const http = axios.create({ baseURL: API_URL, timeout: 6000 });

http.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const isLogin = String(error.config?.url || '').includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      await tokenStorage.clear();
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  },
);

function normalizeError(e) {
  if (!e.response) {
    const err = new Error('Tidak dapat terhubung ke server');
    err.isNetwork = true;
    return err;
  }
  const err = new Error(e.response.data?.message || 'Terjadi kesalahan');
  err.status = e.response.status;
  return err;
}

const call = async (req) => {
  try {
    const r = await req;
    return r.data.data;
  } catch (e) {
    throw normalizeError(e);
  }
};

export const remote = {
  login: (username, password) => call(http.post('/auth/login', { username, password })),
  me: () => call(http.get('/auth/me')),
  listCategories: () => call(http.get('/categories')),
  createCategory: (d) => call(http.post('/categories', d)),
  updateCategory: (id, d) => call(http.put(`/categories/${id}`, d)),
  deleteCategory: (id) => call(http.delete(`/categories/${id}`)),
  listProducts: (params) => call(http.get('/products', { params })),
  getProductByBarcode: (code) => call(http.get(`/products/barcode/${encodeURIComponent(code)}`)),
  createProduct: (d) => call(http.post('/products', d)),
  updateProduct: (id, d) => call(http.put(`/products/${id}`, d)),
  deleteProduct: (id) => call(http.delete(`/products/${id}`)),
  listSuppliers: () => call(http.get('/suppliers')),
  createSupplier: (d) => call(http.post('/suppliers', d)),
  updateSupplier: (id, d) => call(http.put(`/suppliers/${id}`, d)),
  deleteSupplier: (id) => call(http.delete(`/suppliers/${id}`)),
  listPurchases: (params) => call(http.get('/purchases', { params })),
  getPurchase: (id) => call(http.get(`/purchases/${id}`)),
  createPurchase: (d) => call(http.post('/purchases', d)),
  updatePurchase: (id, d) => call(http.put(`/purchases/${id}`, d)),
  receivePurchase: (id) => call(http.post(`/purchases/${id}/receive`)),
  cancelPurchase: (id) => call(http.post(`/purchases/${id}/cancel`)),
  deletePurchase: (id) => call(http.delete(`/purchases/${id}`)),
  checkout: (d) => call(http.post('/transactions', d)),
  myTransactions: () => call(http.get('/transactions/mine')),
  dashboard: () => call(http.get('/reports/dashboard')),
  reportTransactions: (params) => call(http.get('/reports/transactions', { params })),
};
