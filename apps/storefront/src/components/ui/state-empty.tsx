import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

interface StateEmptyProps {
  icon?: IconName;
  eyebrow?: string;
  title: string;
  description?: string;
  cta?: ReactNode;
  variant?: 'page' | 'inline';
}

/**
 * EmptyState — paridade com States.jsx (window.EmptyState).
 * Identidade jewelry-v1: surface morna, ink-muted, container centralizado.
 */
export function StateEmpty({
  icon = 'search',
  eyebrow,
  title,
  description,
  cta,
  variant = 'page',
}: StateEmptyProps) {
  const isPage = variant === 'page';
  return (
    <div
      style={{
        padding: isPage ? '80px 20px' : '48px 20px',
        textAlign: 'center',
        maxWidth: 560,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: 'var(--surface)',
          color: 'var(--text-muted)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 20px',
        }}
        aria-hidden="true"
      >
        <Icon name={icon} size={28} />
      </div>
      {eyebrow && (
        <p
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: isPage ? 28 : 22,
          margin: 0,
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h2>
      {description && (
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
      )}
      {cta && <div style={{ marginTop: 24 }}>{cta}</div>}
    </div>
  );
}
