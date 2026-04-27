'use client';

import { useEffect } from 'react';

/**
 * Global error — captura falhas no proprio root layout (raras).
 * Precisa renderizar <html>/<body> proprios. Estilo inline minimo,
 * sem depender de tokens (CSS pode ter falhado no carregamento).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== 'undefined') {
      console.error('[storefront] global-error:', error);
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          background: '#FAF7F0',
          color: '#1A1612',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: '#F4E6E6',
              color: '#A84444',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 32,
              margin: 0,
              marginBottom: 12,
              fontWeight: 400,
            }}
          >
            Algo deu errado.
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#6B6055', marginBottom: 24 }}>
            Tivemos um problema serio ao carregar a loja. Recarregue ou volte em alguns minutos
            — sua sacola e desejos continuam salvos.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: '#1A1612',
              color: '#FAFAF6',
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Recarregar
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: 16,
                fontSize: 11,
                color: '#A89B8C',
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                letterSpacing: '0.06em',
              }}
            >
              Ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
