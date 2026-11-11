import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../../src/theme';
import { dataService } from '../../src/services/dataService';
import { useToast } from '../../src/context/ToastContext';
import { formatDateLong, formatDateTime, formatMonth, rupiah, ymd } from '../../src/utils/format';
import { Button, Card, Chip, Empty, Loading, Screen, StatCard } from '../../src/components/ui';
import ReceiptModal from '../../src/components/ReceiptModal';

export default function ReportsScreen() {
  const toast = useToast();
  const [period, setPeriod] = useState('daily'); // 'daily' | 'monthly'
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await dataService.reportTransactions({ period, date: ymd(date) }));
    } catch (e) {
      toast.show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [period, date, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const shift = (dir) => {
    const d = new Date(date);
    if (period === 'monthly') d.setMonth(d.getMonth() + dir, 1);
    else d.setDate(d.getDate() + dir);
    setDate(d);
  };

  const label = period === 'monthly' ? formatMonth(date) : formatDateLong(date);

  return (
    <Screen title="Laporan Penjualan" subtitle="Riwayat transaksi per hari atau per bulan">
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Chip label="Harian" active={period === 'daily'} onPress={() => setPeriod('daily')} />
        <Chip label="Bulanan" active={period === 'monthly'} onPress={() => setPeriod('monthly')} />
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Button small variant="ghost" title="◀" onPress={() => shift(-1)} />
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 16, color: colors.text }}>{label}</Text>
        <Button small variant="ghost" title="▶" onPress={() => shift(1)} />
        <Button small variant="outline" title="Hari ini" onPress={() => setDate(new Date())} />
      </Card>

      {loading && !data ? (
        <Loading />
      ) : data ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <StatCard label="Jumlah Transaksi" value={String(data.summary.count)} icon="🧾" tone="info" />
            <StatCard label="Total Omzet" value={rupiah(data.summary.revenue)} icon="💰" tone="success" />
          </View>

          <Card style={{ padding: 0 }}>
            {data.items.length === 0 ? <Empty text="Tidak ada transaksi pada periode ini." /> : null}
            {data.items.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => setSelected(t)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border, backgroundColor: pressed ? colors.bg : '#fff' })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: colors.text }}>{t.transactionNumber}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {formatDateTime(t.createdAt)} · {t.user?.name} · {t.details.length} jenis barang
                  </Text>
                </View>
                <Text style={{ fontWeight: '800', color: colors.primary }}>{rupiah(t.totalAmount)}</Text>
                <Text style={{ color: colors.muted, marginLeft: 8 }}>›</Text>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      <ReceiptModal visible={!!selected} trx={selected} onClose={() => setSelected(null)} title="Detail Transaksi" />
    </Screen>
  );
}
