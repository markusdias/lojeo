'use client';

import { useEffect, useRef, useState } from 'react';

interface RecommendedProduct {
  productId: string;
  name: string;
  slug: string;
  priceCents: number;
}

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[] | null>(null);
  const [inViewport, setInViewport] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) { setInViewport(true); observer.disconnect(); }
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inViewport) return;
    fetch(`/api/recommendations?productId=${productId}&type=fbt&limit=4`)
      .then(r => r.json())
      .then((d: { products?: RecommendedProduct[] }) => setRecommendations(d.products ?? []))
      .catch(() => setRecommendations([]));
  }, [inViewport, productId]);

  if (recommendations === null || recommendations.length === 0) {
    return <div ref={ref} style={{ minHeight: 1 }} />;
  }

  return (
    <section ref={ref} style={{ padding: '48px 0', borderTop: '1px solid var(--divider)' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Combina com
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-display)' }}>
          Frequentemente compradas juntas
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {recommendations.map(p => (
          <a
            key={p.productId}
            href={`/produtos/${p.slug}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: 16,
              border: '1px solid var(--divider)',
              borderRadius: 4,
              background: 'var(--surface)',
              display: 'block',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>{p.name}</p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{fmt(p.priceCents)}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
