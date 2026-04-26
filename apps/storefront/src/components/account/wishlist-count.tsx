'use client';

import { useWishlist } from '../wishlist/wishlist-provider';

export function WishlistCount({
  emptyLabel = 'nenhuma peça salva',
  singularLabel = 'peça salva',
  pluralLabel = 'peças salvas',
}: {
  emptyLabel?: string;
  singularLabel?: string;
  pluralLabel?: string;
}) {
  const { count } = useWishlist();
  if (count === 0) return <>{emptyLabel}</>;
  if (count === 1) return <>1 {singularLabel}</>;
  return <>{count} {pluralLabel}</>;
}
