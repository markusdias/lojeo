import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

/**
 * EmptyState reutilizável — cards/seções vazias com CTA opcional.
 * Match design system: ícone + título + descrição + botão primary + secondary.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="lj-card" style={{
      padding: 'var(--space-12) var(--space-6)',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-3)',
    }}>
      {icon && (
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}>
          {icon}
        </div>
      )}
      <div>
        <h3 style={{
          fontSize: 'var(--text-h4)',
          fontWeight: 'var(--w-semibold)',
          marginBottom: description ? 'var(--space-1)' : 0,
        }}>
          {title}
        </h3>
        {description && (
          <p className="body-s" style={{ maxWidth: 360, margin: '0 auto' }}>
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {action && (
            <Link href={action.href} className="lj-btn-primary" style={{ textDecoration: 'none' }}>
              {action.label}
            </Link>
          )}
          {secondaryAction && (
            <Link href={secondaryAction.href} className="lj-btn-secondary" style={{ textDecoration: 'none' }}>
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
