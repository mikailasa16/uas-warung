// Satu pintu akses data. Mode 'api' = server MySQL asli, 'mock' = demo offline di perangkat.
import { remote, setUnauthorizedHandler } from './remoteApi';
import { mock } from './mockApi';

let mode = 'api';

const METHODS = [
  'me', 'listCategories', 'createCategory', 'updateCategory', 'deleteCategory',
  'listProducts', 'getProductByBarcode', 'createProduct', 'updateProduct', 'deleteProduct',
  'checkout', 'myTransactions', 'dashboard', 'reportTransactions',
];

export const dataService = {
  getMode: () => mode,
  setSession(newMode, user) {
    mode = newMode;
    mock.setUser(user);
  },
  onUnauthorized: setUnauthorizedHandler,

  // Coba server asli dulu; jika tidak terjangkau, otomatis pakai mode demo offline.
  async login(username, password) {
    try {
      const r = await remote.login(username, password);
      return { ...r, mode: 'api' };
    } catch (e) {
      if (!e.isNetwork) throw e;
      const r = await mock.login(username, password);
      return { ...r, mode: 'mock' };
    }
  },
};

METHODS.forEach((m) => {
  dataService[m] = (...args) => (mode === 'mock' ? mock : remote)[m](...args);
});
