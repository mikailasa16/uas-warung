import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '../../src/theme';
import { dataService } from '../../src/services/dataService';
import { useToast } from '../../src/context/ToastContext';
import { rupiah } from '../../src/utils/format';
import { Badge, Button, Card, Empty, Loading, Screen, StatCard } from '../../src/components/ui';
import { Text } from '../../src/components/Typography';

export default function DashboardScreen() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await dataService.dashboard());
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

  if (loading && !data) return <Loading />;
  if (!data) return <Screen title="Ringkasan"><Empty text="Data ringkasan belum dapat dimuat." /></Screen>;

  const max = Math.max(1, ...data.last7Days.map((d) => d.revenue));

  return (
    <Screen title="Ringkasan" subtitle="Penjualan dan persediaan hari ini" right={<Button small variant="ghost" title="Perbarui" onPress={load} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Penjualan hari ini" value={rupiah(data.todayRevenue)} icon="PJ" tone="success" />
        <StatCard label="Transaksi hari ini" value={String(data.todayTransactions)} icon="TR" tone="info" />
        <StatCard label="Stok menipis" value={`${data.lowStockCount} produk`} icon="ST" tone={data.lowStockCount > 0 ? 'warn' : 'success'} />
      </View>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text, marginBottom: 12 }}>Penjualan 7 hari terakhir</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150 }}>
          {data.last7Days.map((d) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>{d.revenue > 0 ? Math.round(d.revenue / 1000) + 'rb' : ''}</Text>
              <View style={{ width: '60%', height: Math.max(3, Math.round((d.revenue / max) * 110)), backgroundColor: colors.primary, borderRadius: 6 }} />
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{d.date.slice(8)}/{d.date.slice(5, 7)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text, marginBottom: 8 }}>Produk dengan stok di bawah 5</Text>
        {data.lowStockProducts.length === 0 ? (
          <Empty text="Tidak ada produk dengan stok menipis." />
        ) : (
          data.lowStockProducts.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{p.productName}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{p.category?.categoryName}</Text>
              </View>
              <Badge text={p.stock === 0 ? 'Habis' : `Sisa ${p.stock}`} tone={p.stock === 0 ? 'danger' : 'warn'} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
