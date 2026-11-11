import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { colors, STORE_NAME } from '../theme';
import { formatDateTime, rupiah } from '../utils/format';
import { printReceipt, sharePdf } from '../utils/printReceipt';
import { AppModal, Button } from './ui';

const Line = ({ left, right, bold }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }}>
    <Text style={{ fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }), fontWeight: bold ? '800' : '400', color: colors.text }}>{left}</Text>
    <Text style={{ fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }), fontWeight: bold ? '800' : '400', color: colors.text }}>{right}</Text>
  </View>
);
const Dash = () => <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#94A3B8', marginVertical: 8 }} />;

export default function ReceiptModal({ visible, trx, onClose, title = 'Struk Pembelian' }) {
  const [msg, setMsg] = useState('');
  if (!trx) return null;

  const run = async (fn) => {
    setMsg('');
    try {
      await fn(trx);
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={title}
      maxWidth={420}
      footer={
        <>
          <Button title="Tutup" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Cetak" variant="outline" onPress={() => run(printReceipt)} style={{ flex: 1 }} />
          {Platform.OS !== 'web' ? <Button title="Simpan PDF" onPress={() => run(sharePdf)} style={{ flex: 1 }} /> : null}
        </>
      }
    >
      <View style={{ backgroundColor: '#FFFEF7', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16 }}>
        <Text style={{ textAlign: 'center', fontWeight: '800', fontSize: 18, color: colors.text }}>{STORE_NAME}</Text>
        <Text style={{ textAlign: 'center', color: colors.muted, marginBottom: 6 }}>Struk Pembelian</Text>
        <Dash />
        <Text style={{ color: colors.text }}>No: {trx.transactionNumber}</Text>
        <Text style={{ color: colors.text }}>Tgl: {formatDateTime(trx.createdAt)}</Text>
        <Text style={{ color: colors.text }}>Kasir: {trx.user?.name || '-'}</Text>
        <Dash />
        {trx.details.map((d) => (
          <View key={d.id} style={{ marginBottom: 6 }}>
            <Text style={{ fontWeight: '600', color: colors.text }}>{d.product?.productName}</Text>
            <Line left={`${d.quantity} x ${rupiah(d.unitPrice)}`} right={rupiah(d.subtotal)} />
          </View>
        ))}
        <Dash />
        <Line left="Total" right={rupiah(trx.totalAmount)} bold />
        <Line left="Tunai" right={rupiah(trx.paymentAmount)} />
        <Line left="Kembalian" right={rupiah(trx.changeAmount)} />
        <Dash />
        <Text style={{ textAlign: 'center', color: colors.muted }}>Terima kasih sudah berbelanja!</Text>
      </View>
      {msg ? <Text style={{ color: colors.danger, marginTop: 10 }}>{msg}</Text> : null}
    </AppModal>
  );
}
