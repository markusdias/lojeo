'use client';

/**
 * Botão "Gerenciar cookies" — reabre o CookieBanner em modo "custom"
 * para o titular revogar ou alterar consent (LGPD art. 8 §5 + art. 18).
 *
 * Usado em /privacidade e no Footer. Dispatcha evento custom escutado
 * pelo CookieBanner em layout.tsx.
 */
export function ManageCookiesButton({
  variant = 'ghost',
  label = 'Gerenciar cookies',
}: {
  variant?: 'ghost' | 'footer';
  label?: string;
}) {
  function open() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('lojeo:open-cookie-banner'));
  }

  if (variant === 'footer') {
    return (
      <button
        type="button"
        onClick={open}
        style={{
          display: 'block',
          fontSize: 13,
          color: 'var(--footer-muted)',
          marginBottom: 12,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      style={{
        display: 'inline-block',
        padding: '10px 20px',
        background: 'transparent',
        color: 'var(--text-primary)',
        fontSize: 14,
        fontWeight: 500,
        border: '1px solid var(--divider)',
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}
