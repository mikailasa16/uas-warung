import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { dataService } from '../services/dataService';
import { kv, tokenStorage } from '../services/storage';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('api'); // 'api' | 'mock'
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    await kv.remove('session');
    dataService.setSession('api', null);
    setUser(null);
  }, []);

  // Pulihkan sesi saat aplikasi dibuka kembali
  useEffect(() => {
    dataService.onUnauthorized(() => {
      logout();
    });
    (async () => {
      const s = await kv.get('session');
      if (s?.user) {
        const token = await tokenStorage.get();
        if (s.mode === 'mock' || token) {
          dataService.setSession(s.mode, s.user);
          setMode(s.mode);
          setUser(s.user);
        }
      }
      setReady(true);
    })();
  }, [logout]);

  const login = async (username, password) => {
    const r = await dataService.login(username.trim(), password);
    await tokenStorage.set(r.token);
    await kv.set('session', { mode: r.mode, user: r.user });
    dataService.setSession(r.mode, r.user);
    setMode(r.mode);
    setUser(r.user);
    return r;
  };

  return <AuthCtx.Provider value={{ user, mode, ready, login, logout }}>{children}</AuthCtx.Provider>;
}
