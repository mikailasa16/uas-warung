import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BREAKPOINT, borderWidth, colors, layout, radius, space, STORE_NAME } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Badge, Loading } from '../../src/components/ui';
import { Text } from '../../src/components/Typography';

const NAV = [
  { href: '/dashboard', label: 'Ringkasan', roles: ['admin'] },
  { href: '/pos', label: 'Kasir', roles: ['admin', 'operator'] },
  { href: '/pembelian', label: 'Pembelian', roles: ['admin'] },
  { href: '/products', label: 'Produk', roles: ['admin'] },
  { href: '/categories', label: 'Kategori', roles: ['admin'] },
  { href: '/reports', label: 'Laporan', roles: ['admin'] },
];

function Monogram({ size = 34 }) {
  return (
    <View style={{ width: size, height: size, backgroundColor: colors.brick, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.cream, fontSize: size * 0.34, fontWeight: '700', letterSpacing: 0.4 }}>WR</Text>
    </View>
  );
}

function NavItem({ item, active, onPress, compact }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        compact ? compactItemStyle(active) : desktopItemStyle(active),
        hovered && !compact && !active && { backgroundColor: '#2A251F' },
        hovered && compact && { backgroundColor: colors.espressoSoft },
        pressed && { opacity: 0.8 },
      ]}
    >
      {!compact ? (
        <View style={{ width: 3, height: 18, marginRight: 11, backgroundColor: active ? colors.brick : 'transparent', borderRadius: 1 }} />
      ) : null}
      <Text
        style={{
          color: active ? colors.cream : colors.creamMuted,
          fontWeight: active ? '600' : '500',
          fontSize: compact ? 11 : 13.5,
          letterSpacing: compact ? 0 : 0.1,
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function desktopItemStyle(active) {
  return {
    height: layout.navItemHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.sm,
    paddingRight: space.md,
    marginBottom: 1,
    borderRadius: radius.sm,
    backgroundColor: active ? colors.espressoSoft : 'transparent',
  };
}

function compactItemStyle(active) {
  return {
    alignItems: 'center',
    paddingTop: 9,
    paddingBottom: 6,
    borderTopWidth: 2,
    borderTopColor: active ? colors.brick : 'transparent',
  };
}

export default function AppShell() {
  const { user, ready, mode, logout } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();

  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/login" />;

  const nav = NAV.filter((n) => n.roles.includes(user.role));
  const current = NAV.find((n) => pathname.startsWith(n.href));
  if (current && !current.roles.includes(user.role)) return <Redirect href="/pos" />;

  const wide = width >= BREAKPOINT;
  const roleLabel = user.role === 'admin' ? 'Pemilik' : 'Kasir';
  const isActive = (href) => pathname.startsWith(href);

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.paper }}>
        <View style={{ width: layout.sidebar, backgroundColor: colors.espresso, borderRightWidth: borderWidth.hairline, borderRightColor: '#000' }}>
          <View style={{ height: borderWidth.accent, backgroundColor: colors.brick }} />
          <View style={{ padding: space.lg, paddingTop: space.xl, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Monogram />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.cream, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.1 }} numberOfLines={1}>
                  {STORE_NAME}
                </Text>
                <Text style={{ color: colors.creamMuted, fontSize: 10.5, fontWeight: '500', letterSpacing: 0.2, marginTop: 2 }}>
                  POS &amp; Stok
                </Text>
              </View>
            </View>

            <View style={{ marginTop: space.xxl, flex: 1 }}>
              <Text style={{ color: colors.creamMuted, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.2, marginBottom: space.sm, marginLeft: space.sm }}>
                MENU
              </Text>
              {nav.map((n) => (
                <NavItem key={n.href} item={n} active={isActive(n.href)} onPress={() => router.replace(n.href)} />
              ))}
            </View>

            {mode === 'mock' ? (
              <View style={{ marginBottom: space.md }}>
                <Badge text="Mode demo offline" tone="warn" />
              </View>
            ) : null}

            <View style={{ borderTopWidth: borderWidth.hairline, borderTopColor: '#3A332B', paddingTop: space.md }}>
              <Text style={{ color: colors.cream, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={{ color: colors.creamMuted, fontSize: 11, fontWeight: '500', marginTop: 2 }}>
                {roleLabel}
              </Text>
              <Pressable onPress={logout} style={({ hovered }) => [{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginTop: 4 }, hovered && { opacity: 0.75 }]}>
                <Text style={{ color: colors.creamMuted, fontSize: 12.5, fontWeight: '500' }}>Keluar</Text>
                <Text style={{ color: colors.creamMuted, fontSize: 13, marginLeft: 6 }}>→</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={mobileBarStyles.bar}>
        <Monogram size={28} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 14, letterSpacing: -0.2 }} numberOfLines={1}>
            {STORE_NAME}
          </Text>
          <Text style={{ color: colors.mutedInk, fontSize: 11, fontWeight: '500' }}>
            {user.name} · {roleLabel}
            {mode === 'mock' ? ' · Demo' : ''}
          </Text>
        </View>
        <Pressable onPress={logout} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: colors.mutedInk, fontSize: 12, fontWeight: '600' }}>Keluar</Text>
          <Text style={{ color: colors.mutedInk, fontSize: 12, marginLeft: 4 }}>→</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <Slot />
      </View>
      {nav.length > 1 ? (
        <View style={mobileBarStyles.nav}>
          {nav.map((n) => (
            <View key={n.href} style={{ flex: 1 }}>
              <NavItem item={n} active={isActive(n.href)} onPress={() => router.replace(n.href)} compact />
            </View>
          ))}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const mobileBarStyles = {
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.hairline,
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: colors.espresso,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: colors.hairline,
  },
};
