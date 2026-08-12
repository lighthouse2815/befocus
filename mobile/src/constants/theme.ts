import type { TextStyle, ViewStyle } from 'react-native'

export const colors = {
  paper: '#f6f5f0',
  paperRaised: '#fffefa',
  ink: '#1e2924',
  inkSoft: '#59645e',
  line: '#d9dfd8',
  lineStrong: '#b9c5bb',
  moss: '#2f6f59',
  mossDark: '#1f503e',
  mossWash: '#e6f0e9',
  clay: '#c96843',
  clayWash: '#f8e9e1',
  amber: '#a96c13',
  amberWash: '#fff1d2',
  ocean: '#4f7188',
  plum: '#795b70',
  danger: '#b83a3a',
  dangerWash: '#fbe8e8',
  white: '#ffffff',
  overlay: 'rgba(30, 41, 36, 0.38)',
} as const

export const spacing = { x1: 4, x2: 8, x3: 12, x4: 16, x6: 24, x8: 32, x12: 48 } as const
export const radii = { control: 6, surface: 10, tray: 16, round: 999 } as const
export const iconSizes = { inline: 16, control: 18, tab: 22, feature: 26 } as const
export const touchTarget = 48

export const typography = {
  eyebrow: { fontFamily: 'DMSans_700Bold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' } satisfies TextStyle,
  title: { fontFamily: 'DMSans_700Bold', fontSize: 28, lineHeight: 34 } satisfies TextStyle,
  heading: { fontFamily: 'DMSans_700Bold', fontSize: 20, lineHeight: 26 } satisfies TextStyle,
  subheading: { fontFamily: 'DMSans_600SemiBold', fontSize: 17, lineHeight: 23 } satisfies TextStyle,
  body: { fontFamily: 'DMSans_400Regular', fontSize: 16, lineHeight: 24 } satisfies TextStyle,
  bodyStrong: { fontFamily: 'DMSans_600SemiBold', fontSize: 16, lineHeight: 24 } satisfies TextStyle,
  small: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 } satisfies TextStyle,
  smallStrong: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, lineHeight: 20 } satisfies TextStyle,
  timer: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 60, lineHeight: 68, letterSpacing: -2 } satisfies TextStyle,
  data: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 15, lineHeight: 20 } satisfies TextStyle,
} as const

export const surface: ViewStyle = {
  backgroundColor: colors.paperRaised,
  borderColor: colors.line,
  borderRadius: radii.surface,
  borderWidth: 1,
}
