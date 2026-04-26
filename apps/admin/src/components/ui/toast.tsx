'use client';

/**
 * Toast — notificações transientes empilhadas (bottom-right).
 *
 * Spec base: docs/design-system/project/preview/components-toasts.html
 * Tokens: lj-card + var(--success/warning/error/info-soft) + ícone tone-colored.
 *
 * Uso:
 *   const { push } = useToast();
 *   push({ variant: 'success', title: 'Vendido!', message: 'Pedido confirmado.' });
 *
 * Aplicar <ToastProvider> uma única vez no layout root.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface ToastInput {
  variant?: ToastVariant;
  title: string;
  message?: string;
  /** ms — default 4000. Use 0 pra desabilitar auto-dismiss. */
  duration?: number;
}

interface ToastInstance extends ToastInput {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (t: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { bar: string; soft: string; icon: ReactNode }> = {
  success: {
    bar: 'var(--success)',
    soft: 'var(--success-soft)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m5 12 5 5L20 7" />
      </svg>
    ),
  },
  warning: {
    bar: 'var(--warning)',
    soft: 'var(--warning-soft)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    ),
  },
  error: {
    bar: 'var(--error)',
    soft: 'var(--error-soft)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
  },
  info: {
    bar: 'var(--info)',
    soft: 'var(--info-soft)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastInstance[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((t: ToastInput) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const variant = t.variant ?? 'info';
    const duration = t.duration ?? 4000;
    setItems(prev => [...prev, { ...t, id, variant }]);
    if (duration > 0) {
      const handle = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, handle);
    }
    return id;
  }, [dismiss]);

  useEffect(() => {
    return () => {
      timers.current.forEach(h => clearTimeout(h));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div
        role="region"
        aria-label="Notificações"
        style={{
          position: 'fixed',
          bottom: 'var(--space-4)',
          right: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          zIndex: 100,
          maxWidth: 'min(460px, calc(100vw - var(--space-8)))',
          pointerEvents: 'none',
        }}
      >
        {items.map(item => (
          <ToastView key={item.id} item={item} onClose={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onClose }: { item: ToastInstance; onClose: () => void }) {
  const v = VARIANT_STYLES[item.variant];
  return (
    <div
      role="status"
      aria-live="polite"
      className="lj-card"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: v.soft,
        borderLeft: `3px solid ${v.bar}`,
        boxShadow: 'var(--shadow-md, 0 4px 12px -4px rgba(10,10,10,0.12))',
        pointerEvents: 'auto',
        animation: 'lj-toast-in 180ms var(--ease-out, ease-out)',
      }}
    >
      <span style={{ color: v.bar, flexShrink: 0, marginTop: 1 }}>{v.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>{item.title}</p>
        {item.message && (
          <p style={{ fontSize: 13, color: 'var(--fg-secondary)', margin: '2px 0 0', lineHeight: 1.45 }}>
            {item.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar notificação"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--fg-muted)',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: 0,
          marginLeft: 'auto',
          flexShrink: 0,
        }}
      >
        ×
      </button>
      <style>{`@keyframes lj-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
