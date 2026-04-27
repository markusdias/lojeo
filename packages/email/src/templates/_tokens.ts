// Email-safe tokens — espelham jewelry-v1 (colors_and_type.css) com
// fallbacks de fontes web-safe (Georgia/Helvetica/Arial), porque
// clientes de email não suportam @import de Google Fonts confiavelmente.
//
// Mantenha em sincronia com docs/design-system-jewelry-v1/project/colors_and_type.css

export const tokens = {
  // Cores (paper-warm + ink + champagne accent — combo default)
  bg: '#FAF7F0',
  surface: '#FFFFFF',
  surfaceSunken: '#F4F1E9',
  divider: '#E8E2D6',
  textPrimary: '#1A1612',
  textSecondary: '#6B6055',
  textMuted: '#A89B8C',
  accent: '#B8956A',
  accentHover: '#9F7E58',
  textOnDark: '#FAF7F0',

  // Typography (web-safe fallback chain — display = serif, body = sans)
  fontDisplay: `Georgia, 'Times New Roman', serif`,
  fontBody: `-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`,
  fontMono: `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`,

  // Tipografia — escala
  fsEyebrow: 11,
  fsCaption: 12,
  fsSmall: 14,
  fsBody: 16,
  fsH3: 22,
  fsH2: 32,

  // Tracking
  eyebrowTracking: '0.12em',
  displayTracking: '0.02em',

  // Radius
  rSm: 2,
  rMd: 4,
  rLg: 8,

  // Layout
  emailWidth: 600,
} as const;

export type Tokens = typeof tokens;
