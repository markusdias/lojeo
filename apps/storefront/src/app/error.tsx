'use client';

import { useEffect } from 'react';
import { StateError } from '../components/ui/state-error';

/**
 * Error boundary global do storefront — paridade visual com States.jsx ErrorState.
 * Mantem fora do <html>/<body> (esses ficam no global-error.tsx).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: enviar para Sentry/observabilidade quando provider for definido
    if (typeof console !== 'undefined') {
      console.error('[storefront] error boundary:', error);
    }
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        padding: '40px var(--container-pad) 80px',
      }}
    >
      <StateError
        title="Nao conseguimos carregar esta pagina."
        description="Pode ser instabilidade temporaria. Tente novamente em alguns segundos — sua sacola e desejos continuam salvos."
        onRetry={reset}
      />
      {error.digest && (
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginTop: 12,
            letterSpacing: '0.06em',
          }}
        >
          Ref: {error.digest}
        </p>
      )}
    </div>
  );
}
