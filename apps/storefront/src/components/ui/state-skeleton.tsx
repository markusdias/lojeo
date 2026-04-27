/**
 * Skeleton primitives — paridade com States.jsx (window.SkeletonGrid + .skeleton-shimmer).
 * Usa classe `.skeleton` ja definida em globals.css com tokens jewelry-v1.
 */

interface SkeletonGridProps {
  count?: number;
  columns?: number;
}

export function SkeletonGrid({ count = 8, columns = 4 }: SkeletonGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 24,
      }}
      role="status"
      aria-live="polite"
      aria-label="Carregando produtos"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            className="skeleton aspect-product"
            style={{ borderRadius: 4, overflow: 'hidden' }}
          />
          <div
            className="skeleton"
            style={{ height: 14, borderRadius: 2, width: '70%', marginTop: 6 }}
          />
          <div
            className="skeleton"
            style={{ height: 12, borderRadius: 2, width: '40%' }}
          />
        </div>
      ))}
    </div>
  );
}

interface SkeletonLineProps {
  width?: string | number;
  height?: number;
  className?: string;
}

export function SkeletonLine({ width = '100%', height = 14, className }: SkeletonLineProps) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{ width, height, borderRadius: 2 }}
      aria-hidden="true"
    />
  );
}

export function SkeletonPageHeader() {
  return (
    <div style={{ marginBottom: 40 }}>
      <SkeletonLine width={120} height={11} />
      <div style={{ height: 16 }} />
      <SkeletonLine width="60%" height={42} />
    </div>
  );
}
