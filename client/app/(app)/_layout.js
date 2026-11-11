import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BREAKPOINT, colors, STORE_NAME } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { Badge, Loading } from '../../src/components/ui';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin'] },
  { href: '/pos', label: 'Kasir', icon: '🛒', roles: ['admin', 'operator'] },
  { href: '/products', label: 'Produk', icon: '📦', roles: ['admin'] },
  { href: '/categories', label: 'Kategori', icon: '🏷️', roles: ['admin'] },
  { href: '/reports', label: 'Laporan', icon: '🧾', roles: ['admin'] },
];

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
  const roleLabel = user.role === 'admin' ? 'Admin / Pemilik' : 'Kasir';

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
        <View style={{ width: 220, backgroundColor: colors.primaryDark, padding: 16 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>🏪 {STORE_NAME}</Text>
          <View style={{ marginTop: 24, flex: 1 }}>
            {nav.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Pressable key={n.href} onPress={() => router.replace(n.href)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 4, backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'transparent' }}>
                  <Text style={{ fontSize: 18, marginRight: 10 }}>{n.icon}</Text>
                  <Text style={{ color: '#fff', fontWeight: active ? '800' : '500', fontSize: 15 }}>{n.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {mode === 'mock' ? <View style={{ marginBottom: 10 }}><Badge text="MODE DEMO OFFLINE" tone="warn" /></View> : null}
          <Text style={{ color: '#fff', fontWeight: '700' }}>{user.name}</Text>
          <Text style={{ color: '#99F6E4', marginBottom: 10 }}>{roleLabel}</Text>
          <Pressable onPress={logout} style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Keluar</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primaryDark }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>🏪 {STORE_NAME}</Text>
          <Text style={{ color: '#99F6E4', fontSize: 12 }}>{user.name} · {roleLabel}{mode === 'mock' ? ' · DEMO OFFLINE' : ''}</Text>
        </View>
        <Pressable onPress={logout} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Keluar</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Slot />
      </View>
      {nav.length > 1 ? (
        <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.border }}>
          {nav.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Pressable key={n.href} onPress={() => router.replace(n.href)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 20 }}>{n.icon}</Text>
                <Text style={{ fontSize: 11, fontWeight: active ? '800' : '500', color: active ? colors.primary : colors.muted }}>{n.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
