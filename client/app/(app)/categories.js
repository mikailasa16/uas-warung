import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../../src/theme';
import { dataService } from '../../src/services/dataService';
import { useToast } from '../../src/context/ToastContext';
import { confirmDialog } from '../../src/utils/confirm';
import { AppModal, Badge, Button, Card, Empty, Input, Loading, Screen } from '../../src/components/ui';
import { Text } from '../../src/components/Typography';

export default function CategoriesScreen() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // { id?, categoryName }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await dataService.listCategories());
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

  const save = async () => {
    if (!form.categoryName.trim()) return setError('Nama kategori harus diisi.');
    setSaving(true);
    setError('');
    try {
      if (form.id) await dataService.updateCategory(form.id, { categoryName: form.categoryName.trim() });
      else await dataService.createCategory({ categoryName: form.categoryName.trim() });
      setForm(null);
      toast.show('Kategori berhasil disimpan.', 'success');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!(await confirmDialog('Hapus kategori?', `Kategori "${c.categoryName}" akan dihapus.`))) return;
    try {
      await dataService.deleteCategory(c.id);
      toast.show('Kategori berhasil dihapus.', 'success');
      load();
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <Screen title="Kategori" subtitle="Atur kelompok produk, seperti sembako dan minuman." right={<Button small title="+ Kategori" onPress={() => { setError(''); setForm({ categoryName: '' }); }} />}>
      <Card style={{ padding: 0 }}>
        {rows.length === 0 ? <Empty text="Belum ada kategori. Tambahkan kategori untuk mengelompokkan produk." /> : null}
        {rows.map((c, i) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border, gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{c.categoryName}</Text>
              <View style={{ marginTop: 4 }}><Badge text={`${c.productCount} produk`} tone="info" /></View>
            </View>
            <Button small variant="outline" title="Ubah" onPress={() => { setError(''); setForm({ id: c.id, categoryName: c.categoryName }); }} />
            <Button small variant="dangerOutline" title="Hapus" onPress={() => remove(c)} />
          </View>
        ))}
      </Card>

      <AppModal
        visible={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Ubah kategori' : 'Tambah kategori'}
        maxWidth={420}
        footer={
          <>
            <Button title="Batal" variant="ghost" onPress={() => setForm(null)} style={{ flex: 1 }} />
            <Button title="Simpan" onPress={save} loading={saving} style={{ flex: 1 }} />
          </>
        }
      >
        <Input label="Nama kategori" value={form?.categoryName || ''} onChangeText={(t) => setForm({ ...form, categoryName: t })} autoFocus onSubmitEditing={save} />
        {error ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
      </AppModal>
    </Screen>
  );
}
