import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BREAKPOINT, colors } from '../../src/theme';
import { dataService } from '../../src/services/dataService';
import { useCart } from '../../src/context/CartContext';
import { useToast } from '../../src/context/ToastContext';
import { LOW_STOCK, rupiah } from '../../src/utils/format';
import { Badge, Button, Chip, Loading, Screen } from '../../src/components/ui';
import CartPanel from '../../src/components/CartPanel';
import PayModal from '../../src/components/PayModal';
import ReceiptModal from '../../src/components/ReceiptModal';

function ProductTile({ p, onPress }) {
  const out = p.stock <= 0;
  const low = !out && p.stock < LOW_STOCK;
  return (
    <Pressable
      disabled={out}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, out && { opacity: 0.45 }, pressed && { backgroundColor: colors.primaryLight }]}
    >
      <Text style={styles.tileName} numberOfLines={2}>{p.productName}</Text>
      <Text style={styles.tilePrice}>{rupiah(p.sellingPrice)}</Text>
      <Badge text={out ? 'Habis' : low ? `Sisa ${p.stock}` : `Stok ${p.stock}`} tone={out ? 'danger' : low ? 'warn' : 'muted'} />
    </Pressable>
  );
}

export default function PosScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= BREAKPOINT;
  const cart = useCart();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catId, setCatId] = useState(null);
  const [scan, setScan] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([dataService.listProducts(), dataService.listCategories()]);
      setProducts(p);
      setCategories(c);
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) => (!catId || p.categoryId === catId) && (!q || p.productName.toLowerCase().includes(q) || (p.barcode || '').includes(q)),
    );
  }, [products, search, catId]);

  const catalogWidth = wide ? width - 220 - 380 : width;
  const cols = Math.max(2, Math.floor((catalogWidth - 16) / 165));
  const data = useMemo(() => {
    const rows = [...filtered];
    while (rows.length % cols !== 0) rows.push({ id: `pad-${rows.length}`, pad: true });
    return rows;
  }, [filtered, cols]);

  const onScan = () => {
    const code = scan.trim();
    if (!code) return;
    const p = products.find((x) => x.barcode === code);
    if (!p) toast.show(`Barcode ${code} tidak ditemukan`, 'error');
    else {
      cart.add(p);
      toast.show(`Ditambahkan: ${p.productName}`, 'success');
    }
    setScan('');
  };

  // Simulasi scanner barcode: ambil produk acak yang stoknya ada
  const simulateScan = () => {
    const avail = products.filter((p) => p.barcode && p.stock > 0);
    if (!avail.length) return toast.show('Tidak ada produk dengan barcode', 'error');
    const p = avail[Math.floor(Math.random() * avail.length)];
    cart.add(p);
    toast.show(`Scan ${p.barcode}: ${p.productName}`, 'success');
  };

  const confirmPay = async (paymentAmount) => {
    const trx = await dataService.checkout({
      items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentAmount,
    });
    cart.clear();
    setPayOpen(false);
    setCartOpen(false);
    setReceipt(trx);
    load(); // refresh stok
  };

  if (loading) return <Loading />;

  const catalog = (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, paddingBottom: 4 }}>
        <TextInput value={search} onChangeText={setSearch} placeholder="🔍  Cari nama produk atau barcode..." placeholderTextColor="#94A3B8" style={styles.search} />
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          <TextInput
            value={scan}
            onChangeText={setScan}
            onSubmitEditing={onScan}
            placeholder="Scan / ketik barcode lalu Enter"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            style={[styles.search, { flex: 1 }]}
          />
          <Button small title="Tambah" variant="outline" onPress={onScan} />
          <Button small title="Simulasi Scan" onPress={simulateScan} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <Chip label="Semua" active={!catId} onPress={() => setCatId(null)} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.categoryName} active={catId === c.id} onPress={() => setCatId(c.id)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        key={cols}
        data={data}
        numColumns={cols}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 8, paddingBottom: wide ? 16 : 90 }}
        renderItem={({ item }) =>
          item.pad ? <View style={{ flex: 1, margin: 4 }} /> : <ProductTile p={item} onPress={() => cart.add(item)} />
        }
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.muted, padding: 32 }}>Produk tidak ditemukan</Text>}
      />
    </View>
  );

  return (
    <Screen title="Kasir" subtitle="Ketuk produk untuk menambah ke keranjang" scroll={false}>
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>{catalog}</View>
          <View style={{ width: 380, backgroundColor: '#fff', borderLeftWidth: 1, borderColor: colors.border }}>
            <CartPanel onPay={() => setPayOpen(true)} />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {catalog}
          {cart.count > 0 ? (
            <Pressable onPress={() => setCartOpen(true)} style={styles.floatBar}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>🛒 {cart.count} item</Text>
              <Text style={{ color: '#fff', fontWeight: '800' }}>{rupiah(cart.total)}  ›</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <Modal visible={cartOpen} animationType="slide" onRequestClose={() => setCartOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <Pressable onPress={() => setCartOpen(false)} style={{ padding: 14, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>‹ Kembali ke produk</Text>
          </Pressable>
          <CartPanel onPay={() => { setCartOpen(false); setPayOpen(true); }} />
        </SafeAreaView>
      </Modal>

      <PayModal visible={payOpen} total={cart.total} onClose={() => setPayOpen(false)} onConfirm={confirmPay} />
      <ReceiptModal visible={!!receipt} trx={receipt} onClose={() => setReceipt(null)} title="Pembayaran Berhasil" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 42, color: colors.text },
  tile: { flex: 1, margin: 4, padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, minHeight: 112, justifyContent: 'space-between' },
  tileName: { fontWeight: '700', color: colors.text, marginBottom: 4 },
  tilePrice: { fontWeight: '800', color: colors.primary, marginBottom: 6 },
  floatBar: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: colors.primary, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', elevation: 4 },
});
