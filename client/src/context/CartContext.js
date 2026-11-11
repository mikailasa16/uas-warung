import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { kv } from '../services/storage';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const hydratedFor = useRef(null);

  // Muat keranjang tersimpan (tahan refresh halaman) per user
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      setItems([]);
      return;
    }
    if (hydratedFor.current === user.id) return;
    (async () => {
      const saved = await kv.get(`cart:${user.id}`);
      hydratedFor.current = user.id;
      setItems(Array.isArray(saved) ? saved : []);
    })();
  }, [user]);

  useEffect(() => {
    if (user && hydratedFor.current === user.id) kv.set(`cart:${user.id}`, items);
  }, [items, user]);

  const add = useCallback(
    (p) => {
      if (p.stock <= 0) return toast.show(`${p.productName} stok habis`, 'error');
      setItems((prev) => {
        const found = prev.find((i) => i.productId === p.id);
        if (found) {
          if (found.quantity + 1 > p.stock) {
            toast.show(`Stok ${p.productName} hanya ${p.stock}`, 'error');
            return prev;
          }
          return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1, stock: p.stock } : i));
        }
        return [...prev, { productId: p.id, productName: p.productName, unitPrice: Number(p.sellingPrice), stock: p.stock, quantity: 1 }];
      });
    },
    [toast],
  );

  const inc = useCallback(
    (id) =>
      setItems((prev) =>
        prev.map((i) => {
          if (i.productId !== id) return i;
          if (i.quantity + 1 > i.stock) {
            toast.show(`Stok ${i.productName} hanya ${i.stock}`, 'error');
            return i;
          }
          return { ...i, quantity: i.quantity + 1 };
        }),
      ),
    [toast],
  );
  const dec = useCallback(
    (id) => setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))),
    [],
  );
  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.productId !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(() => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [items]);
  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  return <CartCtx.Provider value={{ items, add, inc, dec, remove, clear, total, count }}>{children}</CartCtx.Provider>;
}
