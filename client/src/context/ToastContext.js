import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

const ToastCtx = createContext({ show: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((message, type = 'info') => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const bg = toast?.type === 'error' ? colors.danger : toast?.type === 'success' ? colors.success : colors.text;
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.wrap}>
          <View style={[styles.toast, { backgroundColor: bg }]}>
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
  toast: { maxWidth: 480, marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  text: { color: '#fff', fontWeight: '600' },
});
