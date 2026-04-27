'use client';

import { forwardRef, type CSSProperties, type InputHTMLAttributes } from 'react';

/**
 * Input — primitivo storefront jewelry-v1.
 * Paridade com kits jewelry-v1 (campo neutro com borda --divider, foco --accent).
 * Aceita variant onDark (footer com superficie escura: borda translucida + texto claro).
 */
export type InputVariant = 'default' | 'onDark';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  invalid?: boolean;
}

const baseStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  padding: '12px 14px',
  borderRadius: 6,
  outline: 'none',
  width: '100%',
  transition: 'border-color 160ms ease, box-shadow 160ms ease',
};

const variantStyles: Record<InputVariant, CSSProperties> = {
  default: {
    background: 'var(--surface, #fff)',
    color: 'var(--text-primary)',
    border: '1px solid var(--divider)',
  },
  onDark: {
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--footer-text, #FAFAF6)',
    border: '1px solid rgba(255,255,255,0.16)',
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = 'default', invalid, style, ...rest },
  ref,
) {
  const variantStyle = variantStyles[variant];
  const borderColor = invalid ? 'var(--accent)' : undefined;
  const merged: CSSProperties = {
    ...baseStyle,
    ...variantStyle,
    ...(borderColor ? { border: `1px solid ${borderColor}` } : {}),
    ...style,
  };
  return <input ref={ref} aria-invalid={invalid || undefined} style={merged} {...rest} />;
});
