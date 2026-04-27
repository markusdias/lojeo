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
  width: 56,
  height: 56,
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

export const IconTag = () => (
  <svg {...iconProps}>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx={7.5} cy={7.5} r=".5" fill="currentColor" />
  </svg>
);

export const IconLayers = () => (
  <svg {...iconProps}>
    <path d="m12.83 2.18-9.04 4.52a1 1 0 0 0 0 1.79l9.04 4.52a1 1 0 0 0 .9 0l9.04-4.52a1 1 0 0 0 0-1.79l-9.04-4.52a1 1 0 0 0-.9 0Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
);

export const IconBoxes = () => (
  <svg {...iconProps}>
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
    <path d="m7 16.5-4.74-2.85" />
    <path d="m7 16.5 5-3" />
    <path d="M7 16.5v5.17" />
    <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
    <path d="m17 16.5-5-3" />
    <path d="m17 16.5 4.74-2.85" />
    <path d="M17 16.5v5.17" />
    <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
    <path d="M12 8 7.26 5.15" />
    <path d="m12 8 4.74-2.85" />
    <path d="M12 13.5V8" />
  </svg>
);

export const IconShieldCheck = () => (
  <svg {...iconProps}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

/**
 * EmptyState reutilizável — cards/seções vazias com CTA opcional.
 * Match Empty.jsx ref: ícone Lucide 56x56 sem círculo de fundo, headline,
 * body em body-s, botões primary + secondary. Tone "é normal nas primeiras semanas".
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="lj-empty-state">
      {icon && <div className="lj-empty-state__icon">{icon}</div>}
      <div>
        <h3 className="lj-empty-state__title">{title}</h3>
        {description && <p className="lj-empty-state__body">{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="lj-empty-state__actions">
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
