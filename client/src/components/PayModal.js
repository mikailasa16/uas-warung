import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../theme';
import { rupiah } from '../utils/format';
import { AppModal, Button, Chip, Input } from './ui';

export default function PayModal({ visible, total, onClose, onConfirm }) {
  const [payStr, setPayStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setPayStr('');
      setError('');
    }
  }, [visible]);

  const pay = Number(payStr) || 0;
  const change = pay - total;

  const quick = useMemo(() => {
    const dens = [5000, 10000, 20000, 50000, 100000];
    const set = new Set([total, ...dens.filter((d) => d >= total), Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000]);
    return [...set].filter((n) => n >= total).sort((a, b) => a - b).slice(0, 5);
  }, [total]);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(pay);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Pembayaran Tunai"
      maxWidth={440}
      footer={
        <>
          <Button title="Batal" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Selesaikan" onPress={submit} loading={submitting} disabled={pay < total || total <= 0} style={{ flex: 2 }} />
        </>
      }
    >
      <Text style={{ color: colors.muted, fontWeight: '600' }}>Total belanja</Text>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary, marginBottom: 14 }}>{rupiah(total)}</Text>

      <Input
        label="Uang diterima (Rp)"
        value={payStr}
        onChangeText={(t) => setPayStr(t.replace(/\D/g, ''))}
        keyboardType="numeric"
        placeholder="0"
        autoFocus
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
        {quick.map((n) => (
          <View key={n} style={{ marginBottom: 8 }}>
            <Chip label={n === total ? 'Uang Pas' : rupiah(n)} active={pay === n} onPress={() => setPayStr(String(n))} />
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: change >= 0 && pay > 0 ? colors.successLight : colors.bg, borderRadius: 12, padding: 14 }}>
        <Text style={{ color: colors.muted, fontWeight: '600' }}>{pay > 0 && change < 0 ? 'Kurang' : 'Kembalian'}</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: pay > 0 && change < 0 ? colors.danger : colors.success }}>
          {rupiah(pay > 0 ? Math.abs(change) : 0)}
        </Text>
      </View>

      {error ? <Text style={{ color: colors.danger, marginTop: 10, fontWeight: '600' }}>{error}</Text> : null}
    </AppModal>
  );
}
