'use client';

import { useWishlist } from './wishlist-provider';
import { useTracker } from '../tracker-provider';

interface HeartButtonProps {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  size?: number;
  style?: React.CSSProperties;
}

export function HeartButton({ productId, slug, name, priceCents, imageUrl, size = 20, style }: HeartButtonProps) {
  const { has, toggle } = useWishlist();
  const tracker = useTracker();
  const active = has(productId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle({ productId, slug, name, priceCents, imageUrl });
    tracker?.track({
      type: active ? 'wishlist_remove' : 'wishlist_add',
      entityType: 'product',
      entityId: productId,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? 'var(--wishlist-color, #C8605A)' : 'none'}
        stroke={active ? 'var(--wishlist-color, #C8605A)' : 'var(--text-muted)'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
