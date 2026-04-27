'use client';

import type { CSSProperties, ReactNode } from 'react';

/**
 * Badge — primitivo storefront jewelry-v1.
 * Paridade com Primitives.jsx (window.Badge): tones neutral/accent/warn/out/dark.
 */
export type BadgeTone = 'neutral' | 'accent' | 'warn' | 'out' | 'dark';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const toneStyles: Record<BadgeTone, CSSProperties> = {
  neutral: {
    background: 'var(--surface, #fff)',
    color: 'var(--text-primary)',
    border: '1px solid var(--divider)',
  },
  accent: { background: 'var(--accent-soft)', color: 'var(--accent)' },
  warn: { background: '#F6EEDC', color: '#B8853A' },
  out: { background: '#F4F4F2', color: 'var(--text-muted)' },
  dark: { background: 'var(--text-primary)', color: '#fff' },
};

const baseStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  padding: '5px 10px',
  borderRadius: 999,
  fontWeight: 500,
  display: 'inline-block',
  fontFamily: 'var(--font-body)',
};

export function Badge({ tone = 'neutral', children, style, className }: BadgeProps) {
  return (
    <span className={className} style={{ ...baseStyle, ...toneStyles[tone], ...style }}>
      {children}
    </span>
  );
}
