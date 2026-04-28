'use client';

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';

/**
 * Button — primitivo storefront jewelry-v1.
 * Paridade com docs/design-system-jewelry-v1/project/ui_kits/storefront/Primitives.jsx (window.Button).
 * Usa tokens jewelry-v1 (--text-primary, --text-on-dark, --accent, --font-body).
 * NAO confundir com packages/ui/Button (generico Tailwind, sem tokens jewelry-v1).
 */
export type ButtonVariant = 'primary' | 'accent' | 'dark' | 'ghost' | 'link';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  full?: boolean;
  children?: ReactNode;
}

const baseStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  fontWeight: 500,
  padding: '14px 28px',
  borderRadius: 8,
  border: 'none',
  letterSpacing: '0.02em',
  transition: 'all 240ms cubic-bezier(.22,1,.36,1)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--accent)', color: 'var(--text-on-accent, #fff)' },
  accent: { background: 'var(--accent)', color: 'var(--text-on-accent, #fff)' },
  dark: { background: 'var(--text-primary)', color: 'var(--text-on-dark)' },
  ghost: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--text-primary)',
  },
  link: {
    background: 'none',
    color: 'var(--text-primary)',
    padding: '10px 0',
    borderBottom: '1px solid var(--text-primary)',
    borderRadius: 0,
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', full, disabled, style, children, type = 'button', ...rest },
  ref,
) {
  const merged: CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    width: full ? '100%' : 'auto',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    ...style,
  };
  return (
    <button ref={ref} type={type} disabled={disabled} style={merged} {...rest}>
      {children}
    </button>
  );
});
