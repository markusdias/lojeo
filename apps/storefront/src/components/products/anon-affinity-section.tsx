'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAnonId } from '@lojeo/tracking/client';

interface Suggestion {
  productId: string;
  name: string;
  slug: string;
  priceCents: number;
}

interface Props {
  currency: string;
}

/**
 * Anônimo recorrente: lê anonymousId do localStorage (via tracker),
 * busca afinidade via /api/recommendations/affinity (product_view 30d).
 * Renderiza apenas quando engagedProducts >= 1 (count >= 2 views).
 *
 * Modo degradado: retorna null silencioso quando API falha.
 */
export function AnonAffinitySection({ currency }: Props) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    const anonId = getAnonId();
    if (!anonId) {
      setItems([]);
      return;
    }
    fetch(`/api/recommendations/affinity?anonymousId=${encodeURIComponent(anonId)}&limit=4`)
      .then(r => r.json())
      .then((d: { products?: Suggestion[]; reason?: string }) => {
        setItems(d.products ?? []);
        setReason(d.reason ?? '');
      })
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });

  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Você gostou destas</p>
          <h2 style={{ margin: 0 }}>Continue explorando</h2>
        </div>
        <Link href="/produtos" style={{ fontSize: 14, borderBottom: '1px solid var(--text-primary)', paddingBottom: 2, color: 'var(--text-primary)' }}>
          ver mais
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {items.map(p => (
          <Link
            key={p.productId}
            href={`/produtos/${p.slug}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{
              aspectRatio: '3/4',
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--r-image)',
              marginBottom: 12,
              display: 'grid', placeItems: 'center',
            }}>
              <div style={{
                width: '60%', height: '60%',
                background: 'linear-gradient(135deg, #D4C5A8 0%, #B8956A22 100%)',
                borderRadius: '50%',
              }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3, margin: '0 0 4px' }}>{p.name}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{formatPrice(p.priceCents)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
