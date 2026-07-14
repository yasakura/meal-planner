export const tokens = {
  colors: {
    creme: '#FAF6EE',
    white: '#FFFFFF',
    sand: '#F3EDDF',
    ink: '#1F1B16',
    inkSecondary: '#6F6557',
    terracotta: '#B83F2C',
    sage: '#5C7E5A',
    hairline: '#ECE4D7',
  },
  radii: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    full: '9999px',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  fonts: {
    serif: "'New York', ui-serif, Georgia, 'Times New Roman', serif",
    body: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
    mono: "'SF Mono', ui-monospace, monospace",
  },
} as const;

export type Tokens = typeof tokens;
