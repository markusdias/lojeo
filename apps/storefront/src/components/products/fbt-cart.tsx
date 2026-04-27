'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useTracker } from '../tracker-provider';

interface RecommendedProduct {
  productId: string;
  name: string;
  slug: string;
  priceCents: number;
}

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * FBT no carrinho — recomendações baseadas no PRIMEIRO produto do cart
 * (heurística simples). Filtra itens já no cart.
 */
export function FrequentlyBoughtTogetherCart({
  cartProductIds,
  eyebrow = 'Que tal levar também',
  title = 'Combina com seu carrinho',
  marginTop = 32,
}: {
  cartProductIds: string[];
  eyebrow?: string;
  title?: string;
  marginTop?: number;
}) {
  const [items, setItems] = useState<RecommendedProduct[] | null>(null);
  const primaryId = cartProductIds[0];
  const inCart = useMemo(() => new Set(cartProductIds), [cartProductIds]);
  const tracker = useTracker();
  const impressionTracked = useRef(false);

  useEffect(() => {
    if (!primaryId) { setItems([]); return; }
    fetch(`/api/recommendations?productId=${primaryId}&type=fbt&limit=6`)
      .then(r => r.json())
      .then((d: { products?: RecommendedProduct[] }) => {
        setItems((d.products ?? []).filter(p => !inCart.has(p.productId)).slice(0, 4));
      })
      .catch(() => setItems([]));
  }, [primaryId, inCart]);

  useEffect(() => {
    if (!tracker || impressionTracked.current) return;
    if (!items || items.length === 0) return;
    impressionTracked.current = true;
    tracker.track({
      type: 'recommendation_impression',
      entityType: 'product',
      entityId: primaryId,
      metadata: {
        source: 'fbt_cart',
        count: items.length,
        productIds: items.map(p => p.productId),
      },
    });
  }, [items, tracker, primaryId]);

  function handleClick(rec: RecommendedProduct, position: number) {
    if (!tracker) return;
    tracker.track({
      type: 'recommendation_click',
      entityType: 'product',
      entityId: rec.productId,
      metadata: {
        source: 'fbt_cart',
        originProductId: primaryId,
        position,
      },
    });
  }

  if (!items || items.length === 0) return null;

  return (
    <section style={{
      padding: '32px 0',
      borderTop: '1px solid var(--divider)',
      marginTop,
    }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
          {eyebrow}
        </p>
        <h3 style={{ fontSize: 28, fontWeight: 400, fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1 }}>
          {title}
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {items.map((p, i) => (
          <a
            key={p.productId}
            href={`/produtos/${p.slug}`}
            onClick={() => handleClick(p, i)}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: 12,
              border: '1px solid var(--divider)',
              borderRadius: 4,
              background: 'var(--surface)',
              display: 'block',
              fontSize: 13,
            }}
          >
            <p style={{ fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</p>
            <p style={{ color: 'var(--text-primary)' }}>{fmt(p.priceCents)}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
