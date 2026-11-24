import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BREAKPOINT, colors } from '../../src/theme';
import { dataService } from '../../src/services/dataService';
import { useToast } from '../../src/context/ToastContext';
import { confirmDialog } from '../../src/utils/confirm';
import { LOW_STOCK, rupiah } from '../../src/utils/format';
import { AppModal, Badge, Button, Card, Chip, Empty, Input, Loading, Screen } from '../../src/components/ui';
import { Text, TextInput } from '../../src/components/Typography';

const EMPTY = { barcode: '', productName: '', categoryId: '', costPrice: '', sellingPrice: '', stock: '' };
const digits = (t) => t.replace(/\D/g, '');

function StockBadge({ stock }) {
  if (stock <= 0) return <Badge text="Habis" tone="danger" />;
  if (stock < LOW_STOCK) return <Badge text={`Menipis · ${stock}`} tone="warn" />;
  return <Badge text={String(stock)} tone="success" />;
}

export default function ProductsScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= BREAKPOINT;
  const toast = useToast();
  const router = useRouter();
  const params = useLocalSearchParams();
  const filterParam = Array.isArray(params.filter) ? params.filter[0] : params.filter;

  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [search, setSearch] = useState('');
  const [catId, setCatId] = useState(null);
  const [lowOnly, setLowOnly] = useState(filterParam === 'low');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        dataService.listProducts({ search: search.trim() || undefined, categoryId: catId || undefined }),
        dataService.listCategories(),
      ]);
      setProducts(p);
      setCats(c);
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, catId, toast]);

  useEffect(() => {
    if (filterParam === 'low') {
      setLowOnly(true);
      setCatId(null);
      setSearch('');
    } else {
      setLowOnly(false);
    }
  }, [filterParam]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const selectAll = () => {
    setCatId(null);
    setLowOnly(false);
    router.setParams({ filter: 'all' });
  };
  const selectLowStock = () => {
    setCatId(null);
    setLowOnly(true);
    router.setParams({ filter: 'low' });
  };
  const selectCategory = (id) => {
    setCatId(id);
    setLowOnly(false);
    router.setParams({ filter: 'all' });
  };

  const openNew = () => {
    setError('');
    setForm({ ...EMPTY, categoryId: cats[0]?.id || '' });
  };
  const openEdit = (p) => {
    setError('');
    setForm({
      id: p.id,
      barcode: p.barcode || '',
      productName: p.productName,
      categoryId: p.categoryId,
      costPrice: String(Number(p.costPrice)),
      sellingPrice: String(Number(p.sellingPrice)),
      stock: String(p.stock),
    });
  };

  const save = async () => {
    const f = form;
    if (!f.productName.trim()) return setError('Nama produk harus diisi.');
    if (!f.categoryId) return setError('Pilih kategori. Tambahkan kategori terlebih dahulu jika belum tersedia.');
    if (f.costPrice === '') return setError('Harga pokok harus diisi.');
    if (f.sellingPrice === '') return setError('Harga jual harus diisi.');
    const payload = {
      barcode: f.barcode.trim() || null,
      productName: f.productName.trim(),
      categoryId: f.categoryId,
      costPrice: Number(f.costPrice),
      sellingPrice: Number(f.sellingPrice),
      stock: Number(f.stock === '' ? 0 : f.stock),
    };
    setSaving(true);
    setError('');
    try {
      if (f.id) await dataService.updateProduct(f.id, payload);
      else await dataService.createProduct(payload);
      setForm(null);
      toast.show('Produk berhasil disimpan.', 'success');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!(await confirmDialog('Hapus produk?', `"${p.productName}" akan dihapus permanen.`))) return;
    try {
      await dataService.deleteProduct(p.id);
      toast.show('Produk berhasil dihapus.', 'success');
      load();
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  if (loading) return <Loading />;

  const visible = lowOnly ? products.filter((p) => Number(p.stock) < LOW_STOCK) : products;

  return (
    <Screen
      title="Produk dan stok"
      subtitle={lowOnly ? `${visible.length} produk stok menipis` : `${visible.length} produk terdaftar`}
      right={<Button small title="+ Produk" onPress={openNew} />}
    >
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Cari produk berdasarkan nama atau kode"
        placeholderTextColor="#94A3B8"
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, marginBottom: 10, color: colors.text }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
        <Chip label="Semua" active={!catId && !lowOnly} onPress={selectAll} />
        <Chip label="Stok menipis" active={lowOnly} onPress={selectLowStock} />
        <View style={{ width: 1, height: 24, alignSelf: 'center', backgroundColor: colors.hairline, marginRight: 10 }} />
        {cats.map((c) => (
          <Chip key={c.id} label={c.categoryName} active={catId === c.id} onPress={() => selectCategory(c.id)} />
        ))}
      </ScrollView>

      <Card style={{ padding: 0 }}>
        {wide ? (
          <View style={{ flexDirection: 'row', padding: 12, backgroundColor: colors.bg, borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
            {[['Produk', 2.2], ['Kategori', 1.2], ['Harga Pokok', 1], ['Harga Jual', 1], ['Stok', 1], ['Aksi', 1.6]].map(([t, f]) => (
              <Text key={t} style={{ flex: f, fontWeight: '800', color: colors.muted, fontSize: 12 }}>{t.toUpperCase()}</Text>
            ))}
          </View>
        ) : null}
        {visible.length === 0 ? (
          <Empty
            text={
              lowOnly
                ? 'Tidak ada produk dengan stok menipis.'
                : 'Produk tidak ditemukan. Coba ubah kata pencarian atau kategori.'
            }
          />
        ) : null}

        {visible.map((p, i) =>
          wide ? (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 2.2 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{p.productName}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{p.barcode || 'Tanpa kode batang'}</Text>
              </View>
              <Text style={{ flex: 1.2, color: colors.text }}>{p.category?.categoryName}</Text>
              <Text style={{ flex: 1, color: colors.text }}>{rupiah(p.costPrice)}</Text>
              <Text style={{ flex: 1, fontWeight: '700', color: colors.text }}>{rupiah(p.sellingPrice)}</Text>
              <View style={{ flex: 1 }}><StockBadge stock={p.stock} /></View>
              <View style={{ flex: 1.6, flexDirection: 'row', gap: 6 }}>
                <Button small variant="outline" title="Ubah" onPress={() => openEdit(p)} />
                <Button small variant="dangerOutline" title="Hapus" onPress={() => remove(p)} />
              </View>
            </View>
          ) : (
            <View key={p.id} style={{ padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>{p.productName}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{p.category?.categoryName} · {p.barcode || 'Tanpa kode batang'}</Text>
                </View>
                <StockBadge stock={p.stock} />
              </View>
              <Text style={{ marginTop: 6, color: colors.text }}>Pokok {rupiah(p.costPrice)}  ·  <Text style={{ fontWeight: '700' }}>Jual {rupiah(p.sellingPrice)}</Text></Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button small variant="outline" title="Ubah" onPress={() => openEdit(p)} style={{ flex: 1 }} />
                <Button small variant="dangerOutline" title="Hapus" onPress={() => remove(p)} style={{ flex: 1 }} />
              </View>
            </View>
          ),
        )}
      </Card>

      <AppModal
        visible={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Ubah produk' : 'Tambah produk'}
        footer={
          <>
            <Button title="Batal" variant="ghost" onPress={() => setForm(null)} style={{ flex: 1 }} />
            <Button title="Simpan" onPress={save} loading={saving} style={{ flex: 1 }} />
          </>
        }
      >
        {form ? (
          <>
            <Input label="Kode batang (opsional)" value={form.barcode} onChangeText={(t) => setForm({ ...form, barcode: t })} keyboardType="numeric" />
            <Input label="Nama produk" value={form.productName} onChangeText={(t) => setForm({ ...form, productName: t })} />
            <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 6 }}>Kategori</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {cats.map((c) => (
                <View key={c.id} style={{ marginBottom: 8 }}>
                  <Chip label={c.categoryName} active={form.categoryId === c.id} onPress={() => setForm({ ...form, categoryId: c.id })} />
                </View>
              ))}
            </View>
            <Input label="Harga pokok (Rp)" value={form.costPrice} onChangeText={(t) => setForm({ ...form, costPrice: digits(t) })} keyboardType="numeric" />
            <Input label="Harga jual (Rp)" value={form.sellingPrice} onChangeText={(t) => setForm({ ...form, sellingPrice: digits(t) })} keyboardType="numeric" />
            <Input label="Stok" value={form.stock} onChangeText={(t) => setForm({ ...form, stock: digits(t) })} keyboardType="numeric" />
            {error ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
          </>
        ) : null}
      </AppModal>
    </Screen>
  );
}
