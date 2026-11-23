import { Platform } from 'react-native';

/**
 * Palet "Buku Kas" — netral.
 * Latar abu-krem tipis, kartu putih, tinta hampir hitam, satu aksen bata.
 * Tidak ada gradient / glass / shadow dekoratif — pemisah pakai hairline.
 */
export const colors = {
  // --- kunci lama (dipakai layar lain, nilainya sudah dialihkan ke palet baru) ---
  primary: '#9A3A26',
  primaryDark: '#262320',
  primaryLight: '#F3E1DB',
  bg: '#F4F3EF',
  card: '#FFFFFF',
  text: '#1B1A18',
  muted: '#6E6A63',
  border: '#DFDCD5',
  danger: '#9A3A26',
  dangerLight: '#F3E1DB',
  warn: '#7A5A12',
  warnLight: '#F4EBD8',
  success: '#3F6B4A',
  successLight: '#E6EDE7',

  // --- palet Buku Kas ---
  paper: '#F4F3EF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDEBE6',

  ink: '#1B1A18',
  inkSoft: '#45423D',
  mutedInk: '#6E6A63',

  hairline: '#DFDCD5',
  hairlineStrong: '#C7C3BA',

  brick: '#9A3A26',
  brickDark: '#7E2E1E',
  brickWash: '#F3E1DB',

  mustard: '#C79A3A',
  mustardInk: '#7A5A12',
  mustardWash: '#F4EBD8',

  pine: '#3F6B4A',
  pineWash: '#E6EDE7',

  espresso: '#1E1C19',
  espressoSoft: '#2B2823',
  cream: '#F4F3EF',
  creamMuted: '#A9A399',
};

/** Skala 4pt. Semua jarak di UI baru diambil dari sini. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 3,
  md: 4,
  lg: 8,
  xl: 10,
};

export const borderWidth = {
  hairline: 1,
  rule: 1.5,
  strong: 2,
  accent: 3,
};

/** Satu-satunya shadow di sistem: modal. Kartu tidak pakai shadow. */
export const shadow = {
  modal: Platform.select({
    web: { boxShadow: '0 16px 40px rgba(28, 25, 23, 0.18)' },
    default: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.18,
      shadowRadius: 40,
      elevation: 12,
    },
  }),
};

/**
 * Skala tipografi. Weight 800 sengaja tidak dipakai lagi.
 * Uang & angka memakai `fonts.mono` + tabular.
 */
export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  page: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  section: { fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  subhead: { fontSize: 14, lineHeight: 20, fontWeight: '700', letterSpacing: -0.1 },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  small: { fontSize: 12, lineHeight: 17, fontWeight: '400' },
  smallStrong: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  mono: { fontFamily: 'monospace', fontVariant: ['tabular-nums'] },
};

export const fonts = {
  /** Monospace sistem — tidak perlu package/font baru. */
  mono: Platform.select({
    web: '"Consolas", "SF Mono", Menlo, "DejaVu Sans Mono", "Liberation Mono", monospace',
    ios: 'Menlo',
    default: 'monospace',
  }),
};

export const layout = {
  sidebar: 236,
  maxContent: 1680,
  navItemHeight: 40,
};

export const BREAKPOINT = 900; // >= ini = layout desktop (sidebar)
export const STORE_NAME = 'Warung Rumahan';
