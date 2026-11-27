import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../../theme';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { AppModal, Badge, Button, Card, Empty, Input, Loading } from '../ui';
import { Text } from '../Typography';

const EMPTY = { name: '', phone: '', address: '', note: '' };

export default function SupplierPanel() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await dataService.listSuppliers());
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setError('');
    setForm({ ...EMPTY });
  };
  const openEdit = (s) => {
    setError('');
    setForm({ id: s.id, name: s.name, phone: s.phone || '', address: s.address || '', note: s.note || '' });
  };

  const save = async () => {
    if (!form.name.trim()) return setError('Nama supplier harus diisi.');
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
    };
    setSaving(true);
    setError('');
    try {
      if (form.id) await dataService.updateSupplier(form.id, payload);
      else await dataService.createSupplier(payload);
      setForm(null);
      toast.show('Supplier berhasil disimpan.', 'success');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    const ok = await confirm({
      title: 'Hapus supplier?',
      message: `"${s.name}" akan dihapus permanen. Supplier yang masih dipakai nota pembelian tidak bisa dihapus.`,
      confirmLabel: 'Hapus',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await dataService.deleteSupplier(s.id);
      toast.show('Supplier berhasil dihapus.', 'success');
      load();
    } catch (e) {
      toast.show(e.message, 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>Data supplier</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Toko atau agen tempat warung membeli barang.</Text>
        </View>
        <Button small title="+ Supplier" onPress={openNew} />
      </View>

      <Card style={{ padding: 0 }}>
        {rows.length === 0 ? <Empty text="Belum ada supplier. Nota pembelian tetap bisa dibuat tanpa supplier." /> : null}
        {rows.map((s, i) => (
          <View key={s.id} style={{ padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{s.name}</Text>
                {s.phone ? <Text style={{ color: colors.muted, fontSize: 12 }}>{s.phone}</Text> : null}
                {s.address ? <Text style={{ color: colors.muted, fontSize: 12 }}>{s.address}</Text> : null}
                {s.note ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{s.note}</Text> : null}
              </View>
              <Badge text={`${s._count?.purchases ?? 0} nota`} tone="info" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button small variant="outline" title="Ubah" onPress={() => openEdit(s)} />
              <Button small variant="dangerOutline" title="Hapus" onPress={() => remove(s)} />
            </View>
          </View>
        ))}
      </Card>

      <AppModal
        visible={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Ubah supplier' : 'Tambah supplier'}
        maxWidth={480}
        footer={
          <>
            <Button title="Batal" variant="ghost" onPress={() => setForm(null)} style={{ flex: 1 }} />
            <Button title="Simpan" onPress={save} loading={saving} style={{ flex: 1 }} />
          </>
        }
      >
        {form ? (
          <>
            <Input label="Nama supplier" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
            <Input label="Telepon (opsional)" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
            <Input label="Alamat (opsional)" value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} multiline numberOfLines={2} />
            <Input label="Catatan (opsional)" value={form.note} onChangeText={(t) => setForm({ ...form, note: t })} multiline numberOfLines={2} />
            {error ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
          </>
        ) : null}
      </AppModal>
    </View>
  );
}
