import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { borderWidth, colors, fonts, layout, radius, shadow, space, type } from '../theme';
import { Text, TextInput } from './Typography';

const VARIANTS = {
  primary: { bg: colors.brick, fg: colors.cream, border: colors.brickDark },
  outline: { bg: colors.surface, fg: colors.ink, border: colors.hairlineStrong },
  danger: { bg: colors.brickDark, fg: colors.cream, border: colors.brickDark },
  dangerOutline: { bg: colors.surface, fg: colors.brickDark, border: colors.brick },
  ghost: { bg: 'transparent', fg: colors.inkSoft, border: 'transparent' },
};

const TONES = {
  success: { bg: colors.pineWash, fg: colors.pine },
  danger: { bg: colors.brickWash, fg: colors.brickDark },
  warn: { bg: colors.mustardWash, fg: colors.mustardInk },
  info: { bg: colors.surfaceAlt, fg: colors.inkSoft },
  muted: { bg: colors.surfaceAlt, fg: colors.mutedInk },
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, small, style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const filled = variant === 'primary' || variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed, hovered }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        hovered && !disabled && { backgroundColor: filled ? colors.brickDark : colors.surfaceAlt },
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.btnText, small && styles.btnTextSmall, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input({ label, error, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.hairlineStrong}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          focused && { borderColor: colors.brick },
          error && { borderColor: colors.brickDark },
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Panel dasar Buku Kas: permukaan kertas + hairline, tanpa shadow. */
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, tone = 'muted' }) {
  const t = TONES[tone] || TONES.muted;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }) => [
        styles.chip,
        hovered && !active && { backgroundColor: colors.surfaceAlt },
        active && { backgroundColor: colors.ink, borderColor: colors.ink },
      ]}
    >
      <Text style={[styles.chipText, active && { color: colors.cream }]}>{label}</Text>
    </Pressable>
  );
}

export function AppModal({ visible, onClose, title, children, footer, maxWidth = 520 }) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxWidth, maxHeight: height * 0.9 }]}>
          <View style={styles.sheetRule} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Text style={styles.closeText} accessibilityLabel="Tutup">×</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
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
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={styles.screenHeader}>
        <View style={styles.screenHeaderInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>{title}</Text>
            {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      </View>
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? styles.screenBody : undefined}
      >
        {scroll ? <View style={styles.screenBodyInner}>{children}</View> : children}
      </Body>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.paper }}>
      <ActivityIndicator size="large" color={colors.brick} />
    </View>
  );
}

export function Empty({ text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

/**
 * Kompatibilitas: layar lama masih memakai StatCard.
 * Versi baru = sel buku kas (label mikro, angka monospace), tanpa lingkaran ikon.
 */
export function StatCard({ label, value, tone = 'info' }) {
  const t = TONES[tone] || TONES.info;
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: t.fg }]}>{value}</Text>
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  microLabel: {
    ...type.micro,
    color: colors.mutedInk,
  },
  mono: {
    fontFamily: fonts.mono,
    fontVariant: ['tabular-nums'],
  },
  panelTitle: {
    ...type.section,
    color: colors.ink,
  },
});

const styles = StyleSheet.create({
  btn: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: borderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { minHeight: 32, paddingHorizontal: space.md, borderRadius: radius.sm },
  btnText: { fontWeight: '600', fontSize: 14, letterSpacing: 0 },
  btnTextSmall: { fontSize: 13 },
  label: {
    ...type.micro,
    color: colors.mutedInk,
    marginBottom: space.sm,
  },
  input: {
    borderWidth: borderWidth.hairline,
    borderColor: colors.hairlineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 40,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 14,
  },
  error: { color: colors.brickDark, marginTop: space.xs, fontSize: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.hairline,
  },
  badge: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    marginRight: space.sm,
  },
  chipText: { fontWeight: '600', color: colors.inkSoft, fontSize: 13 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: borderWidth.hairline,
    borderColor: colors.hairlineStrong,
    overflow: 'hidden',
    ...shadow.modal,
  },
  sheetRule: { height: borderWidth.accent, backgroundColor: colors.brick },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: borderWidth.hairline,
    borderColor: colors.hairline,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, lineHeight: 24, color: colors.mutedInk },
  sheetFooter: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderTopWidth: borderWidth.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceAlt,
  },
  screenHeader: {
    backgroundColor: colors.paper,
    borderBottomWidth: borderWidth.hairline,
    borderColor: colors.hairline,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.lg,
  },
  screenHeaderInner: {
    width: '100%',
    maxWidth: layout.maxContent,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
  },
  screenTitle: { ...type.page, color: colors.ink },
  screenSubtitle: { ...type.small, color: colors.mutedInk, marginTop: space.xs },
  screenBody: { padding: space.xl, paddingBottom: space.xxxl, flexGrow: 1 },
  screenBodyInner: { width: '100%', maxWidth: layout.maxContent, alignSelf: 'center', flexGrow: 1 },
  empty: {
    alignItems: 'center',
    padding: space.xl,
    borderWidth: borderWidth.hairline,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emptyText: { ...type.small, color: colors.mutedInk, textAlign: 'center' },
  statCard: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  statLabel: { ...type.micro, color: colors.mutedInk },
  statValue: monoValueStyle(),
});

/** Angka uang/kuantitas selalu monospace + tabular, seperti nota. */
function monoValueStyle() {
  return {
    fontFamily: fonts.mono,
    fontVariant: ['tabular-nums'],
    fontSize: 22,
    fontWeight: '600',
    marginTop: space.sm,
    color: colors.ink,
  };
}
