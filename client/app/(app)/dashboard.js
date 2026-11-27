import React, { useCallback, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { borderWidth, colors, fonts, radius, space, type } from '../../src/theme';
import { dataService } from '../../src/services/dataService';
import { useToast } from '../../src/context/ToastContext';
import { LOW_STOCK, rupiah } from '../../src/utils/format';
import { Card, Empty, Loading, Screen } from '../../src/components/ui';
import { Text } from '../../src/components/Typography';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function shortRp(n) {
  const v = Number(n) || 0;
  if (v === 0) return '0';
  if (v >= 1e9) return `${trim(v / 1e9)}M`;
  if (v >= 1e6) return `${trim(v / 1e6)}jt`;
  if (v >= 1e3) return `${trim(v / 1e3)}rb`;
  return String(Math.round(v));
}

function trim(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0).replace('.', ',');
}

/** Sumbu Y dengan langkah "bulat" supaya label tidak jadi 133.333. */
function niceScale(maxValue) {
  if (!(maxValue > 0)) return { top: 300000, ticks: [0, 100000, 200000, 300000] };
  const target = maxValue / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= target) || target;
  const top = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks = [];
  for (let i = 0; i * step <= top + step * 0.001 && i < 6; i += 1) ticks.push(Math.round(i * step));
  return { top, ticks };
}

function dayLabel(ymd) {
  const [, m, d] = String(ymd).split('-').map(Number);
  return `${d} ${MONTHS_SHORT[(m || 1) - 1]}`;
}

const mono = { fontFamily: fonts.mono, fontVariant: ['tabular-nums'] };

function MetricCell({ label, value, unit, note, noteTone, last, stack }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: stack ? '100%' : 180,
        paddingHorizontal: space.lg,
        paddingVertical: space.lg,
        borderLeftWidth: !stack && !last ? borderWidth.hairline : 0,
        borderTopWidth: stack && !last ? borderWidth.hairline : 0,
        borderColor: colors.hairline,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: colors.inkSoft }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space.sm }}>
        <Text style={{ ...mono, fontSize: 26, fontWeight: '600', color: colors.ink, letterSpacing: -0.5 }} numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedInk, marginLeft: 5 }}>{unit}</Text> : null}
      </View>
      {note ? (
        <Text style={{ fontSize: 12, marginTop: 4, color: noteTone || colors.mutedInk, fontWeight: '400' }}>{note}</Text>
      ) : null}
    </View>
  );
}

function Chart({ days, compact, plotHeight }) {
  const [focus, setFocus] = useState(null);
  const plotH = plotHeight || (compact ? 176 : 280);
  const values = days.map((d) => Number(d.revenue) || 0);
  const max = Math.max(0, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const todayIdx = days.length - 1;
  const { top, ticks } = niceScale(max);
  const empty = total === 0;

  return (
    <Card style={{ flex: 1, marginBottom: 0 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkSoft }}>Penjualan 7 hari terakhir</Text>
          <Text style={{ ...mono, fontSize: 23, fontWeight: '600', color: colors.ink, marginTop: 6 }}>{rupiah(total)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11.5, color: colors.mutedInk }}>Rata-rata</Text>
          <Text style={{ ...mono, fontSize: 13, color: colors.inkSoft, marginTop: 6 }}>{rupiah(total / Math.max(1, days.length))}</Text>
        </View>
      </View>

      <View style={{ height: 24, justifyContent: 'center', marginTop: space.sm }}>
        {focus != null ? (
          <Text style={{ ...mono, fontSize: 12, color: colors.brick }}>
            {dayLabel(days[focus].date)} · {rupiah(values[focus])}
          </Text>
        ) : (
          <Text style={{ fontSize: 12, color: colors.mutedInk }}>
            {empty ? 'Belum ada penjualan' : compact ? 'Ketuk batang untuk lihat nominal' : 'Arahkan kursor ke batang untuk lihat nominal'}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', marginTop: space.sm }}>
        <View style={{ width: 46, height: plotH, position: 'relative' }}>
          {ticks.map((t) => (
            <Text
              key={t}
              style={{
                ...mono,
                position: 'absolute',
                right: 6,
                bottom: (t / top) * plotH - 7,
                fontSize: 11,
                color: colors.mutedInk,
              }}
            >
              {shortRp(t)}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ height: plotH, position: 'relative' }}>
            {ticks.map((t) => (
              <View
                key={`g${t}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: (t / top) * plotH,
                  height: borderWidth.hairline,
                  backgroundColor: t === 0 ? colors.hairlineStrong : colors.hairline,
                }}
              />
            ))}

            <View style={{ flexDirection: 'row', height: '100%', alignItems: 'flex-end' }}>
              {days.map((d, i) => {
                const v = Number(d.revenue) || 0;
                const h = v > 0 ? Math.max(4, Math.round((v / top) * (plotH - 10))) : 3;
                const isToday = i === todayIdx;
                const active = focus === i;
                return (
                  <Pressable
                    key={d.date}
                    onPress={() => setFocus((f) => (f === i ? null : i))}
                    onHoverIn={() => setFocus(i)}
                    onHoverOut={() => setFocus((f) => (f === i ? null : f))}
                    style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}
                  >
                    <View
                      style={{
                        width: v === 0 ? 10 : compact ? 14 : 28,
                        height: h,
                        backgroundColor: v === 0 ? colors.hairlineStrong : active || isToday ? colors.brick : colors.inkSoft,
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: space.sm }}>
            {days.map((d) => (
              <Text
                key={d.date}
                style={{ ...mono, flex: 1, textAlign: 'center', fontSize: compact ? 10 : 11, color: colors.mutedInk }}
                numberOfLines={1}
              >
                {compact ? dayLabel(d.date).split(' ')[0] : dayLabel(d.date)}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
}

function StockCell({ stock }) {
  const tone = stock <= 0 ? colors.brick : stock <= 2 ? colors.brickDark : stock <= 4 ? colors.mustardInk : colors.mutedInk;
  return (
    <Text style={{ ...mono, fontSize: 13.5, fontWeight: '600', color: tone, minWidth: 34, textAlign: 'right' }}>
      {stock <= 0 ? '—' : stock}
    </Text>
  );
}

function LowStock({ items, total, onOpen, stack }) {
  const fill = !stack;
  return (
    <Card style={{ flex: fill ? 1 : undefined, marginBottom: 0, padding: 0 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
          paddingBottom: space.md,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
          Stok menipis{total > 0 ? ` · ${total}` : ''}
        </Text>
        <Pressable onPress={onOpen} style={({ hovered }) => [{ paddingVertical: 2 }, hovered && { opacity: 0.65 }]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brick }}>Lihat semua →</Text>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: space.lg,
          paddingVertical: 7,
          backgroundColor: colors.surfaceAlt,
          borderTopWidth: borderWidth.hairline,
          borderBottomWidth: borderWidth.hairline,
          borderColor: colors.hairline,
        }}
      >
        <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: colors.mutedInk }}>Produk</Text>
        <Text style={{ width: 110, fontSize: 11, fontWeight: '600', color: colors.mutedInk }}>Kategori</Text>
        <Text style={{ width: 36, fontSize: 11, fontWeight: '600', color: colors.mutedInk, textAlign: 'right' }}>Stok</Text>
      </View>

      <View style={{ flex: fill ? 1 : undefined }}>
        {items.length === 0 ? (
          <View style={{ flex: fill ? 1 : undefined, justifyContent: 'center', padding: space.lg }}>
            <Text style={{ ...type.body, color: colors.mutedInk }}>Semua stok dalam kondisi aman.</Text>
          </View>
        ) : (
          items.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={onOpen}
              style={({ hovered }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexGrow: fill ? 1 : 0,
                  paddingHorizontal: space.lg,
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : borderWidth.hairline,
                  borderColor: colors.hairline,
                },
                hovered && { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <View style={{ flex: 1, paddingRight: space.sm }}>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
                  {p.productName}
                </Text>
              </View>
              <Text style={{ width: 110, fontSize: 12, color: colors.mutedInk }} numberOfLines={1}>
                {p.category?.categoryName || 'Tanpa kategori'}
              </Text>
              <View style={{ width: 36, alignItems: 'flex-end' }}>
                <StockCell stock={Number(p.stock) || 0} />
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View
        style={{
          marginTop: 'auto',
          borderTopWidth: borderWidth.hairline,
          borderColor: colors.hairline,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: space.lg,
          paddingVertical: 9,
          borderBottomLeftRadius: radius.lg - 1,
          borderBottomRightRadius: radius.lg - 1,
        }}
      >
        <Text style={{ fontSize: 11, color: colors.mutedInk }}>Ambang batas stok &lt; {LOW_STOCK}</Text>
      </View>
    </Card>
  );
}

export default function DashboardScreen() {
  const { show: showToast } = useToast();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const stack = width < 1000;
  const compact = width < 640;
  const stackMetrics = width < 620;
  const plotHeight = compact ? 176 : Math.min(340, Math.max(210, Math.round(height * 0.35)));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await dataService.dashboard());
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Muat ulang setiap layar Ringkasan kembali difokuskan (mis. setelah transaksi di Kasir).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !data) return <Loading />;
  if (!data) return <Screen title="Ringkasan"><Empty text="Data ringkasan belum dapat dimuat." /></Screen>;

  const days = data.last7Days || [];
  const low = data.lowStockProducts || [];
  const lowCount = data.lowStockCount || 0;
  const hasSales = Number(data.todayRevenue) > 0;

  const metrics = [
    {
      key: 'revenue',
      label: 'Penjualan hari ini',
      value: rupiah(data.todayRevenue),
      note: hasSales ? 'tercatat hari ini' : 'belum ada transaksi',
      tone: colors.mutedInk,
    },
    {
      key: 'trx',
      label: 'Transaksi',
      value: String(data.todayTransactions),
      note: 'nota tercatat',
      tone: colors.mutedInk,
    },
    {
      key: 'stock',
      label: 'Stok menipis',
      value: String(lowCount),
      unit: 'produk',
      note: lowCount > 0 ? 'perlu dicek' : 'semua stok aman',
      tone: lowCount > 0 ? colors.mustardInk : colors.pine,
    },
  ];

  return (
    <Screen title="Ringkasan" subtitle="Penjualan dan persediaan hari ini">
      <Card style={{ padding: 0, flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
        {metrics.map((m, i) => (
          <MetricCell
            key={m.key}
            label={m.label}
            value={m.value}
            note={m.note}
            noteTone={m.tone}
            last={i === metrics.length - 1}
            stack={stackMetrics}
          />
        ))}
      </Card>

      <View style={{ flexDirection: stack ? 'column' : 'row', alignItems: 'stretch', gap: space.md }}>
        <View style={{ flex: stack ? undefined : 1.6, width: stack ? '100%' : undefined, minWidth: 0 }}>
          <Chart days={days} compact={compact} plotHeight={plotHeight} />
        </View>
        <View style={{ flex: stack ? undefined : 1, width: stack ? '100%' : undefined, minWidth: stack ? undefined : 320 }}>
          <LowStock items={low.slice(0, 5)} total={lowCount} stack={stack} onOpen={() => router.push('/products?sort=stock-asc')} />
        </View>
      </View>
    </Screen>
  );
}
