'use client';

import type { ReactNode } from 'react';
import { Icon } from './icon';
import { Button } from './button';

interface StateErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
}

/**
 * ErrorState — paridade com States.jsx (window.ErrorState).
 * Cor de alerta soft (#F4E6E6 / #A84444) padronizada do kit jewelry-v1.
 */
export function StateError({
  title = 'Algo nao saiu como esperado.',
  description = 'Tente novamente em instantes — ja avisamos a equipe.',
  onRetry,
  retryLabel = 'Tentar novamente',
  children,
}: StateErrorProps) {
  return (
    <div
      style={{
        padding: '80px 20px',
        textAlign: 'center',
        maxWidth: 560,
        margin: '0 auto',
      }}
      role="alert"
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: '#F4E6E6',
          color: '#A84444',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 18px',
        }}
        aria-hidden="true"
      >
        <Icon name="alert" size={26} />
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          margin: 0,
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginTop: 10,
          maxWidth: 420,
          marginInline: 'auto',
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
      {onRetry && (
        <div style={{ marginTop: 24 }}>
          <Button variant="primary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
      {children && <div style={{ marginTop: 24 }}>{children}</div>}
    </div>
  );
}
