/**
 * Design tokens from project DESIGN.md + MobileDiscover palette.
 * Single source for Expo Web + Android.
 */
export const colors = {
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',
  surfaceWarm: '#f4f7f5',
  ink: '#0f172a',
  inkSoft: '#475569',
  inkMuted: '#64748b',
  line: '#e2e8f0',
  tiffany: '#0099A9',
  tiffanyDark: '#007d8a',
  tiffanyDeep: '#006672',
  tiffanySoft: '#f0fafb',
  onTiffany: '#ffffff',
  heroOverlay: 'rgba(15, 23, 42, 0.62)',
  // Mobile discover
  mdSky: '#4ecdd6',
  mdSkySoft: '#6ad6dd',
  mdSkyDeep: '#3bc0cb',
  mdSkyShadow: 'rgba(78, 205, 214, 0.38)',
  mdInk: '#0b1220',
  mdInkSoft: '#8b95a7',
  mdWhite: '#ffffff',
  mdDesktopCanvas: '#0b1220',
} as const

export const rounded = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  card: 26,
  full: 9999,
} as const

export const spacing = {
  unit: 8,
  gutter: 24,
  section: 88,
  container: 1160,
} as const

export const typography = {
  displayFamily: 'PlayfairDisplay_700Bold_Italic',
  headlineFamily: 'PlayfairDisplay_700Bold_Italic',
  bodyFamily: 'Montserrat_400Regular',
  titleFamily: 'Montserrat_700Bold',
  labelFamily: 'Montserrat_700Bold',
} as const

export const layout = {
  /** Phone frame width on web ≥768px — matches current Vite CSS */
  discoverPhoneMaxWidth: 420,
} as const
