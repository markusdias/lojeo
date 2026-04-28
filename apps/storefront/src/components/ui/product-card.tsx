'use client';

import Link from 'next/link';
import { HeartButton } from '../wishlist/heart-button';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  comparePriceCents?: number | null;
  imageUrl?: string | null;
  currency?: string;
}

export function ProductCard({ id, name, slug, priceCents, comparePriceCents, imageUrl, currency = 'BRL' }: ProductCardProps) {
  const price = (priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency });
  const compare = comparePriceCents
    ? (comparePriceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency })
    : null;
  const discount = comparePriceCents && comparePriceCents > priceCents
    ? Math.round((1 - priceCents / comparePriceCents) * 100)
    : null;

  return (
    <Link href={`/produtos/${slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      {/* Imagem */}
      <div data-product-image style={{
        aspectRatio: '3/4',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--r-image)',
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 400ms var(--ease-out)' }}
          />
        ) : (
          <div data-product-placeholder style={{
            width: '100%', height: '100%',
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1">
              <circle cx="12" cy="8" r="4"/><path d="M8 8a4 4 0 0 1 8 0"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
        )}
        {discount && (
          <span style={{
            position: 'absolute', top: 12, left: 12,
            background: 'var(--promo-bg, var(--warning, #B8853A))', color: '#fff',
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 2,
          }}>
            -{discount}%
          </span>
        )}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <HeartButton
            productId={id}
            slug={slug}
            name={name}
            priceCents={priceCents}
            imageUrl={imageUrl}
            size={18}
            style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 999, padding: 5 }}
          />
        </div>
      </div>

      {/* Info */}
      <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)', fontWeight: 400 }}>{name}</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{price}</span>
        {compare && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{compare}</span>
        )}
      </div>
    </Link>
  );
}
