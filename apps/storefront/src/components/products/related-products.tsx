'use client';

import { useEffect, useRef, useState } from 'react';

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
}

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function RelatedProducts({ productId }: { productId: string }) {
  const [items, setItems] = useState<RelatedProduct[] | null>(null);
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
    fetch(`/api/products/related?productId=${productId}&limit=4`)
      .then(r => r.json())
      .then((d: { products?: RelatedProduct[] }) => setItems(d.products ?? []))
      .catch(() => setItems([]));
  }, [inViewport, productId]);

  if (items === null || items.length === 0) {
    return <div ref={ref} style={{ minHeight: 1 }} />;
  }

  return (
    <section ref={ref} style={{ padding: '48px 0', borderTop: '1px solid var(--divider)' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Da mesma família
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-display)' }}>
          Produtos relacionados
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {items.map(p => (
          <a
            key={p.id}
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
