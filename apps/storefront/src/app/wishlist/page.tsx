'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWishlist } from '../../components/wishlist/wishlist-provider';
import { HeartButton } from '../../components/wishlist/heart-button';
import { useCart } from '../../components/cart/cart-provider';

interface StatusItem {
  productId: string;
  priceCents: number;
  comparePriceCents: number | null;
  status: 'active' | 'archived' | 'draft';
  inStock: boolean;
  totalQty: number;
}

interface BadgeInfo {
  label: string;
  bg: string;
  color: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getBadge(snapshot: { priceCents: number; addedAt: number }, current?: StatusItem): BadgeInfo | null {
  if (!current) return null;
  if (current.status === 'archived') {
    return { label: 'Indisponível', bg: 'var(--text-muted, #9CA3AF)', color: '#fff' };
  }
  if (!current.inStock) {
    return { label: 'Esgotado', bg: 'var(--text-muted, #9CA3AF)', color: '#fff' };
  }
  // "Voltou ao estoque" = item antigo (>7d) E agora em estoque (heurística)
  if (current.inStock && current.totalQty > 0 && Date.now() - snapshot.addedAt > SEVEN_DAYS_MS && current.totalQty <= 5) {
    return { label: 'Voltou ao estoque', bg: '#10B981', color: '#fff' };
  }
  // "Em promoção" = preço atual menor que snapshot OU compare > price
  const dropped = current.priceCents < snapshot.priceCents;
  const onSale = current.comparePriceCents != null && current.comparePriceCents > current.priceCents;
  if (dropped || onSale) {
    return { label: 'Em promoção', bg: 'var(--text-primary, #1A1A1A)', color: '#fff' };
  }
  return null;
}

export default function WishlistPage() {
  const { items } = useWishlist();
  const { addItem } = useCart();
  const [statusMap, setStatusMap] = useState<Map<string, StatusItem>>(new Map());

  useEffect(() => {
    if (items.length === 0) return;
    const ids = items.map(i => i.productId).join(',');
    fetch(`/api/wishlist/status?productIds=${ids}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { items?: StatusItem[] } | null) => {
        if (!d?.items) return;
        setStatusMap(new Map(d.items.map(s => [s.productId, s])));
      })
      .catch(() => {});
  }, [items]);

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '80px 16px' }}>
        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} style={{ margin: '0 auto 24px', display: 'block' }}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Lista de desejos</p>
        <h1 style={{ marginBottom: 16 }}>Nenhuma peça salva</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          Clique no coração de qualquer produto para salvá-lo aqui.
        </p>
        <Link
          href="/produtos"
          style={{
            display: 'inline-block', padding: '14px 32px',
            background: 'var(--accent)', color: 'var(--text-on-accent, #fff)',
            fontSize: 14, fontWeight: 500, borderRadius: 8,
          }}
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 80px' }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Lista de desejos</p>
      <h1 style={{ marginBottom: 40 }}>{items.length} {items.length === 1 ? 'peça salva' : 'peças salvas'}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 32 }}>
        {items.map(item => {
          const current = statusMap.get(item.productId);
          const badge = getBadge({ priceCents: item.priceCents, addedAt: item.addedAt }, current);
          const priceDropped = current && current.priceCents < item.priceCents;
          const onSale = current && current.comparePriceCents != null && current.comparePriceCents > current.priceCents;
          const outOfStock = current && (!current.inStock || current.status === 'archived');

          return (
            <div key={item.productId} style={{ position: 'relative' }}>
              <Link href={`/produtos/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div data-product-image style={{
                  aspectRatio: '3/4',
                  borderRadius: 'var(--r-image, 8px)', overflow: 'hidden', marginBottom: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  filter: outOfStock ? 'grayscale(0.5) opacity(0.7)' : undefined,
                }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <div data-product-placeholder style={{ position: 'absolute', inset: 0 }} />
                      <span style={{ fontSize: 32, color: 'var(--text-muted)', position: 'relative' }}>◆</span>
                    </>
                  )}

                  {/* Badge overlay top-left */}
                  {badge && (
                    <span style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      zIndex: 2,
                      background: badge.bg,
                      color: badge.color,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontWeight: 500,
                    }}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 14, marginBottom: 4 }}>{item.name}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
                    {fmt(current?.priceCents ?? item.priceCents)}
                  </p>
                  {(priceDropped || onSale) && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through', margin: 0 }}>
                      {fmt(priceDropped ? item.priceCents : current!.comparePriceCents!)}
                    </p>
                  )}
                </div>
              </Link>

              {/* Heart remove button */}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <HeartButton
                  productId={item.productId}
                  slug={item.slug}
                  name={item.name}
                  priceCents={item.priceCents}
                  imageUrl={item.imageUrl}
                  size={22}
                  style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: 6 }}
                />
              </div>

              <button
                onClick={() => addItem({ id: item.productId, productId: item.productId, slug: item.slug, name: item.name, priceCents: current?.priceCents ?? item.priceCents, qty: 1, imageUrl: item.imageUrl ?? undefined })}
                disabled={outOfStock}
                style={{
                  width: '100%', marginTop: 8, padding: '10px 0',
                  background: outOfStock ? 'var(--text-muted, #9CA3AF)' : 'var(--text-primary)',
                  color: 'var(--text-on-dark)',
                  border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500,
                  cursor: outOfStock ? 'not-allowed' : 'pointer',
                  opacity: outOfStock ? 0.7 : 1,
                }}
              >
                {outOfStock ? 'Esgotado' : 'Adicionar ao carrinho'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
