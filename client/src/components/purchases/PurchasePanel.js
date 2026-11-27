import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, rupiah } from '../../utils/format';
import { purchaseStatusLabel, purchaseStatusTone } from '../../utils/purchaseStatus';
import { printPurchaseNote, sharePurchasePdf } from '../../utils/printPurchaseNote';
import { AppModal, Badge, Button, Card, Chip, Empty, Input, Loading } from '../ui';
import { Text, TextInput } from '../Typography';

const digits = (t) => String(t).replace(/\D/g, '');
const FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'dipesan', label: 'Dipesan' },
  { key: 'diterima', label: 'Diterima' },
  { key: 'batal', label: 'Dibatalkan' },
];

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: 10,
  minHeight: 38,
  backgroundColor: '#fff',
  color: colors.text,
  fontSize: 14,
};
const labelStyle = { fontWeight: '600', color: colors.text, marginBottom: 6 };
const microStyle = { fontSize: 11, fontWeight: '600', color: colors.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 };
const confirmPanelStyle = {
  marginTop: 8,
  padding: 12,
  borderWidth: 1,
  borderColor: colors.hairlineStrong,
  borderRadius: 8,
  backgroundColor: '#fff',
};

export default function PurchasePanel() {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('semua');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [picker, setPicker] = useState(null); // 'produk' | 'baru'
  const [pickerSearch, setPickerSearch] = useState('');
  const [newItem, setNewItem] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailConfirm, setDetailConfirm] = useState(null); // 'receive' | 'cancel' | null

  const load = useCallback(async () => {
    try {
      const [p, s, pr, c] = await Promise.all([
        dataService.listPurchases(),
        dataService.listSuppliers(),
        dataService.listProducts({}),
        dataService.listCategories(),
      ]);
      setRows(p);
      setSuppliers(s);
      setProducts(pr);
      setCats(c);
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (filter !== 'semua' && p.status !== filter) return false;
      if (!q) return true;
      return p.purchaseNumber.toLowerCase().includes(q) || (p.supplier?.name || '').toLowerCase().includes(q);
    });
  }, [rows, filter, search]);

  const total = form ? form.items.reduce((s, it) => s + Number(it.unitCost || 0) * Number(it.quantity || 0), 0) : 0;

  const emptyNewItem = () => ({ productName: '', categoryId: cats[0]?.id || '', unitCost: '', sellingPrice: '', barcode: '', quantity: '1' });

  const openNew = () => {
    setError('');
    setPicker(null);
    setPickerSearch('');
    setForm({ supplierId: '', note: '', items: [] });
  };

  const openDetail = (p) => {
    setDetailConfirm(null);
    setDetail(p);
  };

  const closeDetail = () => {
    if (detailBusy) return;
    // Kalau panel konfirmasi sedang terbuka, X hanya menutup panel itu dulu.
    if (detailConfirm) {
      setDetailConfirm(null);
      return;
    }
    setDetail(null);
  };

  const addProduct = (product) => {
    setForm((f) => {
      const existing = f.items.find((it) => it.productId === product.id);
      if (existing) {
        return {
          ...f,
          items: f.items.map((it) => (it.productId === product.id ? { ...it, quantity: String(Number(it.quantity || 0) + 1) } : it)),
        };
      }
      return {
        ...f,
        items: [
          ...f.items,
          {
            key: `p-${product.id}-${Date.now()}`,
            productId: product.id,
            productName: product.productName,
            quantity: '1',
            unitCost: String(Number(product.costPrice) || 0),
            lastCost: Number(product.costPrice) || 0,
            isNewProduct: false,
            newCategoryId: null,
            newSellingPrice: '',
            newBarcode: '',
          },
        ],
      };
    });
    setPicker(null);
    setError('');
  };

  const addNewProduct = () => {
    if (!newItem.productName.trim()) return setError('Nama barang baru harus diisi.');
    if (!newItem.categoryId) return setError('Pilih kategori barang baru.');
    if (newItem.unitCost === '') return setError('Harga beli barang baru harus diisi.');
    if (newItem.sellingPrice === '') return setError('Harga jual barang baru harus diisi.');
    const item = {
      key: `n-${Date.now()}`,
      productId: null,
      productName: newItem.productName.trim(),
      quantity: newItem.quantity || '1',
      unitCost: newItem.unitCost,
      isNewProduct: true,
      newCategoryId: newItem.categoryId,
      newSellingPrice: newItem.sellingPrice,
      newBarcode: newItem.barcode.trim(),
    };
    setForm((f) => ({ ...f, items: [...f.items, item] }));
    setPicker(null);
    setError('');
  };

  const setItem = (key, patch) => setForm((f) => ({ ...f, items: f.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) }));
  const removeItem = (key) => setForm((f) => ({ ...f, items: f.items.filter((it) => it.key !== key) }));

  const save = async () => {
    if (form.items.length === 0) return setError('Tambahkan minimal satu barang.');
    for (const it of form.items) {
      if (!(Number(it.quantity) >= 1)) return setError(`Jumlah untuk ${it.productName} minimal 1.`);
      if (it.unitCost === '') return setError(`Harga beli ${it.productName} harus diisi.`);
    }
    setSaving(true);
    setError('');
    try {
      await dataService.createPurchase({
        supplierId: form.supplierId || null,
        status: 'dipesan',
        note: form.note.trim() || null,
        items: form.items.map((it) =>
          it.productId
            ? { productId: it.productId, quantity: Number(it.quantity), unitCost: Number(it.unitCost) }
            : {
                productId: null,
                productName: it.productName,
                quantity: Number(it.quantity),
                unitCost: Number(it.unitCost),
                newCategoryId: it.newCategoryId,
                newSellingPrice: Number(it.newSellingPrice),
                newBarcode: it.newBarcode || null,
              },
        ),
      });
      setForm(null);
      toast.show('Nota pembelian disimpan. Stok bertambah saat barang diterima.', 'success');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const receive = async () => {
    if (!detail) return;
    setDetailBusy(true);
    try {
      const updated = await dataService.receivePurchase(detail.id);
      setDetail(updated);
      setDetailConfirm(null);
      toast.show('Barang diterima. Stok sudah diperbarui.', 'success');
      load();
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setDetailBusy(false);
    }
  };

  const cancel = async () => {
    if (!detail) return;
    setDetailBusy(true);
    try {
      const updated = await dataService.cancelPurchase(detail.id);
      setDetail(updated);
      setDetailConfirm(null);
      toast.show('Nota pembelian dibatalkan.', 'success');
      load();
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setDetailBusy(false);
    }
  };

  const runPrint = async (fn) => {
    try {
      await fn(detail);
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  if (loading) return <Loading />;

  const pending = detail && (detail.status === 'draft' || detail.status === 'dipesan');
  const received = detail?.status === 'diterima';

  const detailFooter = !detail ? null : detailConfirm === 'receive' ? (
    <>
      <Button title="Batal" variant="ghost" onPress={() => setDetailConfirm(null)} disabled={detailBusy} style={{ flex: 1 }} />
      <Button title="Ya, terima barang" onPress={receive} loading={detailBusy} style={{ flex: 1 }} />
    </>
  ) : detailConfirm === 'cancel' ? (
    <>
      <Button title="Tidak" variant="ghost" onPress={() => setDetailConfirm(null)} disabled={detailBusy} style={{ flex: 1 }} />
      <Button title="Ya, batalkan nota" variant="danger" onPress={cancel} loading={detailBusy} style={{ flex: 1 }} />
    </>
  ) : (
    <>
      <Button title="Tutup" variant="ghost" onPress={closeDetail} style={{ flex: 1 }} />
      <Button title="Cetak" variant="outline" onPress={() => runPrint(printPurchaseNote)} style={{ flex: 1 }} />
      {Platform.OS !== 'web' ? <Button title="Simpan PDF" onPress={() => runPrint(sharePurchasePdf)} style={{ flex: 1 }} /> : null}
    </>
  );

  const renderItemRow = (it) => (
    <View key={it.key} style={{ borderWidth: 1, borderColor: colors.hairline, borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>{it.productName}</Text>
          {it.isNewProduct ? (
            <Text style={{ color: colors.muted, fontSize: 11 }}>Barang baru · harga jual {rupiah(it.newSellingPrice)}</Text>
          ) : null}
        </View>
        <Pressable onPress={() => removeItem(it.key)} hitSlop={8}>
          <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>Hapus</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={microStyle}>Jumlah</Text>
          <TextInput value={String(it.quantity)} onChangeText={(t) => setItem(it.key, { quantity: digits(t) })} keyboardType="numeric" style={inputStyle} />
        </View>
        <View style={{ flex: 1.6 }}>
          <Text style={microStyle}>Harga beli / unit</Text>
          <TextInput
            value={String(it.unitCost)}
            onChangeText={(t) => setItem(it.key, { unitCost: digits(t) })}
            keyboardType="numeric"
            selectTextOnFocus
            style={inputStyle}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 11, flex: 1 }}>
          {!it.isNewProduct && it.lastCost != null
            ? `Harga terakhir ${rupiah(it.lastCost)} · bisa diubah sesuai nota hari ini.`
            : 'Harga beli untuk barang baru · bisa diubah.'}
        </Text>
        <Text style={{ fontFamily: 'monospace', fontWeight: '600', color: colors.text, fontSize: 13 }}>
          {rupiah(Number(it.unitCost || 0) * Number(it.quantity || 0))}
        </Text>
      </View>
    </View>
  );

  const pickerList = products.filter((p) => {
    const q = pickerSearch.trim().toLowerCase();
    return !q || p.productName.toLowerCase().includes(q) || (p.barcode || '').includes(q);
  });

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>Nota pembelian</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Catat barang yang dipesan (supplier opsional), lalu centang saat barang datang.</Text>
        </View>
        <Button small title="+ Nota" onPress={openNew} />
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Cari nomor nota atau nama supplier"
        placeholderTextColor="#94A3B8"
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, marginBottom: 10, color: colors.text }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>

      <Card style={{ padding: 0 }}>
        {visible.length === 0 ? (
          <Empty
            text={
              rows.length === 0
                ? 'Belum ada nota pembelian. Tekan "+ Nota" untuk mencatat barang yang dipesan.'
                : 'Tidak ada nota yang cocok dengan pencarian atau filter.'
            }
          />
        ) : null}
        {visible.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => openDetail(p)}
            style={{ padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{p.purchaseNumber}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {p.supplier?.name || 'Tanpa supplier'} · {formatDateTime(p.createdAt)}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {p.items.length} jenis barang · {p.items.reduce((s, it) => s + it.quantity, 0)} unit
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Badge text={purchaseStatusLabel(p.status)} tone={purchaseStatusTone(p.status)} />
                <Text style={{ fontWeight: '700', color: colors.text }}>{rupiah(p.totalAmount)}</Text>
              </View>
            </View>
            {p.status === 'dipesan' ? (
              <Text style={{ color: colors.warn, fontSize: 11, fontWeight: '600', marginTop: 6 }}>
                Menunggu barang datang · buka nota untuk mencentang
              </Text>
            ) : null}
          </Pressable>
        ))}
      </Card>

      <AppModal
        visible={!!form}
        onClose={() => setForm(null)}
        title="Buat nota pembelian"
        maxWidth={680}
        footer={
          picker ? (
            <Button title="Kembali" variant="ghost" onPress={() => setPicker(null)} style={{ flex: 1 }} />
          ) : (
            <>
              <Button title="Batal" variant="ghost" onPress={() => setForm(null)} style={{ flex: 1 }} />
              <Button title="Simpan & pesan" onPress={save} loading={saving} style={{ flex: 1 }} />
            </>
          )
        }
      >
        {form ? (
          picker === 'produk' ? (
            <>
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16, marginBottom: 8 }}>Pilih produk terdaftar</Text>
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder="Cari nama atau barcode"
                placeholderTextColor="#94A3B8"
                style={{ ...inputStyle, marginBottom: 8 }}
                autoFocus
              />
              {pickerList.length === 0 ? <Empty text="Produk tidak ditemukan. Gunakan + Produk baru untuk barang yang belum terdaftar." /> : null}
              {pickerList.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: colors.hairline }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colors.text }}>{p.productName}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      {p.category?.categoryName} · stok {p.stock} · beli {rupiah(p.costPrice)}
                    </Text>
                  </View>
                  <Button small title="Tambah" onPress={() => addProduct(p)} />
                </View>
              ))}
              {error ? <Text style={{ color: colors.danger, fontWeight: '600', marginTop: 8 }}>{error}</Text> : null}
            </>
          ) : picker === 'baru' ? (
            <>
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16, marginBottom: 8 }}>Barang baru</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
                Barang ini belum ada di daftar produk. Produk dibuat otomatis saat nota diterima.
              </Text>
              <Input label="Nama barang" value={newItem.productName} onChangeText={(t) => setNewItem({ ...newItem, productName: t })} autoFocus />
              <Text style={labelStyle}>Kategori</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {cats.map((c) => (
                  <View key={c.id} style={{ marginBottom: 8 }}>
                    <Chip label={c.categoryName} active={newItem.categoryId === c.id} onPress={() => setNewItem({ ...newItem, categoryId: c.id })} />
                  </View>
                ))}
              </View>
              <Input label="Harga beli / unit (Rp)" value={newItem.unitCost} onChangeText={(t) => setNewItem({ ...newItem, unitCost: digits(t) })} keyboardType="numeric" />
              <Input label="Harga jual (Rp)" value={newItem.sellingPrice} onChangeText={(t) => setNewItem({ ...newItem, sellingPrice: digits(t) })} keyboardType="numeric" />
              <Input label="Barcode (opsional)" value={newItem.barcode} onChangeText={(t) => setNewItem({ ...newItem, barcode: t })} keyboardType="numeric" />
              <Input label="Jumlah" value={newItem.quantity} onChangeText={(t) => setNewItem({ ...newItem, quantity: digits(t) })} keyboardType="numeric" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="Batal" variant="ghost" onPress={() => setPicker(null)} style={{ flex: 1 }} />
                <Button title="Tambahkan" onPress={addNewProduct} style={{ flex: 1 }} />
              </View>
              {error ? <Text style={{ color: colors.danger, fontWeight: '600', marginTop: 8 }}>{error}</Text> : null}
            </>
          ) : (
            <>
              <Text style={labelStyle}>Supplier (opsional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6, flexGrow: 0 }}>
                <Chip label="Tanpa supplier" active={!form.supplierId} onPress={() => setForm({ ...form, supplierId: '' })} />
                {suppliers.map((s) => (
                  <Chip key={s.id} label={s.name} active={form.supplierId === s.id} onPress={() => setForm({ ...form, supplierId: s.id })} />
                ))}
              </ScrollView>
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 10 }}>
                {suppliers.length === 0
                  ? 'Belum ada data supplier. Nota tetap bisa disimpan tanpa supplier.'
                  : 'Pilih supplier bila ada. Nota tanpa supplier tetap bisa disimpan.'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
                <Text style={labelStyle}>Barang</Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>{form.items.length} jenis</Text>
              </View>
              {form.items.length === 0 ? (
                <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 8, padding: 14, marginBottom: 8 }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Belum ada barang. Tambahkan produk terdaftar atau produk baru di bawah.</Text>
                </View>
              ) : null}
              {form.items.map(renderItemRow)}

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Button small variant="outline" title="+ Produk terdaftar" onPress={() => { setError(''); setPicker('produk'); setPickerSearch(''); }} style={{ flex: 1 }} />
                <Button small variant="outline" title="+ Produk baru" onPress={() => { setError(''); setPicker('baru'); setNewItem(emptyNewItem()); }} style={{ flex: 1 }} />
              </View>

              <Input label="Catatan (opsional)" value={form.note} onChangeText={(t) => setForm({ ...form, note: t })} multiline numberOfLines={2} />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderColor: colors.hairlineStrong }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Total pembelian</Text>
                <Text style={{ fontWeight: '700', color: colors.text, fontFamily: 'monospace' }}>{rupiah(total)}</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
                Harga beli disimpan per nota, jadi bisa berbeda dari nota sebelumnya. Stok belum berubah — stok bertambah saat Anda mencentang "Barang sudah datang".
              </Text>
              {error ? <Text style={{ color: colors.danger, fontWeight: '600', marginTop: 8 }}>{error}</Text> : null}
            </>
          )
        ) : null}
      </AppModal>

      <AppModal
        visible={!!detail}
        onClose={closeDetail}
        title="Detail nota pembelian"
        maxWidth={560}
        footer={detailFooter}
      >
        {detail ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{detail.purchaseNumber}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {detail.supplier?.name || 'Tanpa supplier'} · {formatDateTime(detail.createdAt)}
                </Text>
              </View>
              <Badge text={purchaseStatusLabel(detail.status)} tone={purchaseStatusTone(detail.status)} />
            </View>

            <View style={{ marginTop: 10, padding: 10, backgroundColor: colors.surfaceAlt, borderRadius: 8 }}>
              <Text style={{ color: colors.mutedInk, fontSize: 12 }}>Dipesan: {detail.orderedAt ? formatDateTime(detail.orderedAt) : '-'}</Text>
              <Text style={{ color: colors.mutedInk, fontSize: 12 }}>Diterima: {detail.receivedAt ? formatDateTime(detail.receivedAt) : '-'}</Text>
              {detail.note ? <Text style={{ color: colors.mutedInk, fontSize: 12 }}>Catatan: {detail.note}</Text> : null}
            </View>

            <View style={{ marginTop: 12 }}>
              {detail.items.map((d) => (
                <View key={d.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: colors.hairline }}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>
                    {d.productName}
                    {d.isNewProduct ? ' (barang baru)' : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{d.quantity} x {rupiah(d.unitCost)}</Text>
                    <Text style={{ color: colors.text, fontSize: 12 }}>{rupiah(d.subtotal)}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: colors.hairlineStrong }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>Total</Text>
              <Text style={{ fontWeight: '700', color: colors.text, fontFamily: 'monospace' }}>{rupiah(detail.totalAmount)}</Text>
            </View>

            {received ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.pine, borderRadius: 8, backgroundColor: colors.pineWash, marginTop: 12 }}>
                <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: colors.pine, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>Barang sudah diterima</Text>
                  <Text style={{ color: colors.mutedInk, fontSize: 12 }}>Stok sudah ditambahkan ke produk.</Text>
                </View>
              </View>
            ) : detail.status === 'batal' ? (
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600', marginTop: 12 }}>Nota ini sudah dibatalkan. Stok tidak berubah.</Text>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    if (detailBusy || detailConfirm === 'cancel') return;
                    setDetailConfirm(detailConfirm === 'receive' ? null : 'receive');
                  }}
                  disabled={detailBusy}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: detailConfirm === 'receive', disabled: detailBusy }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: detailConfirm === 'receive' ? colors.pine : colors.brick,
                    borderRadius: 8,
                    backgroundColor: detailConfirm === 'receive' ? colors.pineWash : colors.brickWash,
                    marginTop: 12,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: detailConfirm === 'receive' ? colors.pine : colors.hairlineStrong,
                      backgroundColor: detailConfirm === 'receive' ? colors.pine : '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {detailConfirm === 'receive' ? <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✓</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.ink }}>Barang sudah datang</Text>
                    <Text style={{ color: colors.mutedInk, fontSize: 12 }}>
                      {detailConfirm === 'receive'
                        ? 'Periksa rincian nota, lalu konfirmasi di bawah.'
                        : 'Centang untuk menambah stok semua barang di nota ini.'}
                    </Text>
                  </View>
                </Pressable>

                {detailConfirm === 'receive' ? (
                  <View style={confirmPanelStyle}>
                    <Text style={{ color: colors.inkSoft, fontSize: 12, lineHeight: 18 }}>
                      Stok semua barang di nota {detail.purchaseNumber} akan bertambah, harga pokok diperbarui, dan barang baru otomatis dibuat. Nota yang sudah diterima tidak bisa diubah lagi.
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            {pending && !detailConfirm ? (
              <Button small variant="dangerOutline" title="Batalkan nota" onPress={() => setDetailConfirm('cancel')} style={{ marginTop: 10 }} />
            ) : null}

            {pending && detailConfirm === 'cancel' ? (
              <View style={confirmPanelStyle}>
                <Text style={{ fontWeight: '700', color: colors.ink }}>Batalkan nota ini?</Text>
                <Text style={{ color: colors.inkSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
                  Nota akan berstatus dibatalkan dan stok tidak berubah.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </AppModal>
    </View>
  );
}
