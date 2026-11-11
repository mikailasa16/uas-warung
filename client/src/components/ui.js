import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme';

const VARIANTS = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  outline: { bg: '#fff', fg: colors.primary, border: colors.primary },
  danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
  dangerOutline: { bg: '#fff', fg: colors.danger, border: colors.danger },
  ghost: { bg: colors.bg, fg: colors.text, border: colors.border },
};
const TONES = {
  success: { bg: colors.successLight, fg: colors.success },
  danger: { bg: colors.dangerLight, fg: colors.danger },
  warn: { bg: colors.warnLight, fg: colors.warn },
  info: { bg: colors.primaryLight, fg: colors.primaryDark },
  muted: { bg: colors.bg, fg: colors.muted },
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, small, style }) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : <Text style={[styles.btnText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Input({ label, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[styles.input, error && { borderColor: colors.danger }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, tone = 'muted' }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function AppModal({ visible, onClose, title, children, footer, maxWidth = 520 }) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxWidth, maxHeight: height * 0.9 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function Screen({ title, subtitle, right, children, scroll = true }) {
  const Body = scroll ? ScrollView : View;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.screenHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.muted, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      <Body style={{ flex: 1 }} contentContainerStyle={scroll ? { padding: 16, paddingBottom: 40 } : undefined}>
        {children}
      </Body>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function Empty({ text }) {
  return (
    <View style={{ alignItems: 'center', padding: 32 }}>
      <Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export function StatCard({ label, value, tone = 'info', icon }) {
  const t = TONES[tone];
  return (
    <View style={[styles.card, { flex: 1, minWidth: 220, marginBottom: 0 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted, fontWeight: '600' }}>{label}</Text>
        <View style={{ backgroundColor: t.bg, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 8 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 34, paddingHorizontal: 12 },
  btnText: { fontWeight: '700', fontSize: 15 },
  label: { fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#fff', color: colors.text, fontSize: 15 },
  error: { color: colors.danger, marginTop: 4, fontSize: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginRight: 8 },
  chipText: { fontWeight: '600', color: colors.text },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  sheet: { width: '100%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetFooter: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: colors.border },
  screenHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  screenTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
});
