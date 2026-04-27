import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

// ── Lucide-style line icons 56x56 stroke 1.5 — match Empty.jsx ref ──
const iconProps = {
  width: 32,
  height: 32,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const IconShoppingBag = () => (
  <svg {...iconProps}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export const IconUsers = () => (
  <svg {...iconProps}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx={9} cy={7} r={4} />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconStar = () => (
  <svg {...iconProps}>
    <path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const IconPackage = () => (
  <svg {...iconProps}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="M3.3 7 12 12l8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

export const IconImage = () => (
  <svg {...iconProps}>
    <rect width={18} height={18} x={3} y={3} rx={2} />
    <circle cx={9} cy={9} r={2} />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

export const IconReturn = () => (
  <svg {...iconProps}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8" />
  </svg>
);

export const IconHeadset = () => (
  <svg {...iconProps}>
    <path d="M3 14a9 9 0 0 1 18 0v3a3 3 0 0 1-3 3h-1v-7h4" />
    <path d="M3 14v3a3 3 0 0 0 3 3h1v-7H3" />
  </svg>
);

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
