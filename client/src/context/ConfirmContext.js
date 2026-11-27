// Dialog konfirmasi milik aplikasi (bukan window.confirm) agar tampilannya
// konsisten di web, Android, dan iOS tanpa judul "localhost says".
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AppModal, Button } from '../components/ui';
import { Text } from '../components/Typography';
import { colors } from '../theme';

const ConfirmCtx = createContext(null);

export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options = {}) => {
    const config = typeof options === 'string' ? { title: 'Konfirmasi', message: options } : options;
    return new Promise((resolve) => {
      // Kalau ada dialog yang belum dijawab, anggap dibatalkan dulu.
      if (resolver.current) resolver.current(false);
      resolver.current = resolve;
      setRequest({
        title: config.title || 'Konfirmasi',
        message: config.message || '',
        confirmLabel: config.confirmLabel || 'Ya, lanjutkan',
        cancelLabel: config.cancelLabel || 'Batal',
        tone: config.tone || 'primary',
      });
    });
  }, []);

  const close = useCallback((result) => {
    setRequest(null);
    const resolve = resolver.current;
    resolver.current = null;
    if (resolve) resolve(result);
  }, []);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {/*
        Sengaja baru dipasang saat dibutuhkan. React Native Web membuat wadah
        Modal di akhir <body> ketika komponen Modal pertama kali dipasang, jadi
        memasangnya sejak awal membuat dialog ini selalu berada DI BELAKANG
        modal lain yang dibuka belakangan.
      */}
      {request ? (
        <AppModal
          visible
          onClose={() => close(false)}
          title={request.title}
          maxWidth={440}
          footer={
            <>
              <Button title={request.cancelLabel} variant="ghost" onPress={() => close(false)} style={{ flex: 1, minWidth: 110 }} />
              <Button
                title={request.confirmLabel}
                variant={request.tone === 'danger' ? 'danger' : 'primary'}
                onPress={() => close(true)}
                style={{ flex: 1, minWidth: 150 }}
              />
            </>
          }
        >
          <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{request.message}</Text>
        </AppModal>
      ) : null}
    </ConfirmCtx.Provider>
  );
}
