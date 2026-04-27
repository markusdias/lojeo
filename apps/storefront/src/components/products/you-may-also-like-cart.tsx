'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTracker } from '../tracker-provider';

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
}

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * YouMayAlsoLike no carrinho — heurística "produtos similares" via /api/products/related
 * (mesma coleção/categoria). Distinção do FBT: não é par de pedido, é afinidade de catálogo.
 */
export function YouMayAlsoLikeCart({
  cartProductIds,
  excludeProductIds = [],
  marginTop = 64,
}: {
  cartProductIds: string[];
  excludeProductIds?: string[];
  marginTop?: number;
}) {
  const [items, setItems] = useState<RelatedProduct[] | null>(null);
  const primaryId = cartProductIds[0];
  const exclude = useMemo(
    () => new Set([...cartProductIds, ...excludeProductIds]),
    [cartProductIds, excludeProductIds],
  );
  const tracker = useTracker();
  const impressionTracked = useRef(false);

  useEffect(() => {
    if (!primaryId) {
      setItems([]);
      return;
    }
    fetch(`/api/products/related?productId=${primaryId}&limit=8`)
      .then(r => r.json())
      .then((d: { products?: RelatedProduct[] }) => {
        const filtered = (d.products ?? []).filter(p => !exclude.has(p.id)).slice(0, 4);
        setItems(filtered);
      })
      .catch(() => setItems([]));
  }, [primaryId, exclude]);

  useEffect(() => {
    if (!tracker || impressionTracked.current) return;
    if (!items || items.length === 0) return;
    impressionTracked.current = true;
    tracker.track({
      type: 'recommendation_impression',
      entityType: 'product',
      entityId: primaryId,
      metadata: {
        source: 'ymal_cart',
        count: items.length,
        productIds: items.map(p => p.id),
      },
    });
  }, [items, tracker, primaryId]);

  function handleClick(rec: RelatedProduct, position: number) {
    if (!tracker) return;
    tracker.track({
      type: 'recommendation_click',
      entityType: 'product',
      entityId: rec.id,
      metadata: { source: 'ymal_cart', originProductId: primaryId, position },
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
        <p style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          margin: '0 0 8px',
        }}>
          Você também pode gostar
        </p>
        <h3 style={{
          fontSize: 28,
          fontWeight: 400,
          fontFamily: 'var(--font-display)',
          margin: 0,
          lineHeight: 1.1,
        }}>
          Peças com o mesmo mood
        </h3>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {items.map((p, i) => (
          <a
            key={p.id}
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
