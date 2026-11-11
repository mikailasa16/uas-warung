import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { useCart } from '../context/CartContext';
import { rupiah } from '../utils/format';
import { Button, Empty } from './ui';

export default function CartPanel({ onPay }) {
  const { items, inc, dec, remove, clear, total, count } = useCart();
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Keranjang ({count})</Text>
        {items.length > 0 ? (
          <Pressable onPress={clear}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Kosongkan</Text>
          </Pressable>
        ) : null}
      </View>

      {items.length === 0 ? (
        <Empty text="Keranjang masih kosong. Ketuk produk untuk menambahkan." />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
          {items.map((i) => (
            <View key={i.productId} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={2}>{i.productName}</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }}>{rupiah(i.unitPrice)}</Text>
                <View style={styles.qtyRow}>
                  <Pressable onPress={() => dec(i.productId)} style={styles.qtyBtn}><Text style={styles.qtyTxt}>−</Text></Pressable>
                  <Text style={{ minWidth: 34, textAlign: 'center', fontWeight: '800', fontSize: 16 }}>{i.quantity}</Text>
                  <Pressable onPress={() => inc(i.productId)} style={styles.qtyBtn}><Text style={styles.qtyTxt}>+</Text></Pressable>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Pressable onPress={() => remove(i.productId)} hitSlop={8}><Text style={{ color: colors.danger, fontSize: 18 }}>✕</Text></Pressable>
                <Text style={{ fontWeight: '800', color: colors.text }}>{rupiah(i.unitPrice * i.quantity)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 16, color: colors.muted, fontWeight: '600' }}>Total</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>{rupiah(total)}</Text>
        </View>
        <Button title="Bayar" onPress={onPay} disabled={items.length === 0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  item: { flexDirection: 'row', padding: 12, marginBottom: 8, backgroundColor: colors.bg, borderRadius: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  qtyBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qtyTxt: { fontSize: 20, fontWeight: '800', color: colors.primary },
  footer: { padding: 16, borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
});
