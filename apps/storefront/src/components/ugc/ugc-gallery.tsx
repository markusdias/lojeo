'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface UgcPost {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  customerName: string | null;
  productsTagged: Array<{ productId: string; x: number; y: number; label?: string }>;
  approvedAt: string | null;
}

type FilterKey = 'todos' | 'tagged' | 'recent';

export function UgcGallery({
  productId,
  eyebrow = 'Comunidade',
  title = 'Como nossas clientes usam',
  columns,
  showFilters = false,
}: {
  productId?: string;
  eyebrow?: string;
  title?: string;
  columns?: number;
  showFilters?: boolean;
}) {
  const [posts, setPosts] = useState<UgcPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [inViewport, setInViewport] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Intersection Observer — só faz fetch quando proximo do viewport
  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInViewport(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inViewport) return;
    const url = productId ? `/api/ugc/gallery?productId=${productId}&limit=12` : '/api/ugc/gallery?limit=24';
    fetch(url)
      .then(r => r.json())
      .then((d: { posts: UgcPost[] }) => { setPosts(d.posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [inViewport, productId]);

  const filteredPosts = useMemo(() => {
    if (filter === 'tagged') return posts.filter(p => p.productsTagged && p.productsTagged.length > 0);
    if (filter === 'recent') {
      return [...posts].sort((a, b) => {
        const aT = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
        const bT = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
        return bT - aT;
      }).slice(0, 12);
    }
    return posts;
  }, [posts, filter]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i === null ? null : Math.min(i + 1, filteredPosts.length - 1)));
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i === null ? null : Math.max(i - 1, 0)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, filteredPosts.length]);

  return (
    <section ref={ref} style={{ padding: '48px 0', minHeight: 1 }}>
      {loading ? (
        inViewport ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                {eyebrow}
              </p>
              <div style={{ height: 32, width: 280, background: 'var(--surface)', borderRadius: 4 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : 'repeat(auto-fill, minmax(180px, 1fr))', gap: columns ? 8 : 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '1', background: 'var(--surface)', borderRadius: 4 }} />
              ))}
            </div>
          </>
        ) : null
      ) : posts.length === 0 ? null : (
        <>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                {eyebrow}
              </p>
              <h2 style={{ fontSize: 28, fontWeight: 400, fontFamily: 'var(--font-display)' }}>
                {title}
              </h2>
            </div>
            {showFilters && (
              <div role="tablist" aria-label="Filtros da galeria" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--divider, #e5e0d6)' }}>
                {[
                  { key: 'todos' as const, label: 'Todas' },
                  { key: 'tagged' as const, label: 'Com produto marcado' },
                  { key: 'recent' as const, label: 'Mais recentes' },
                ].map(f => {
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(f.key)}
                      style={{
                        padding: '8px 14px',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 12,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: active ? 'var(--ink, #1a1a1a)' : 'var(--text-muted)',
                        borderBottom: active ? '2px solid var(--accent, #B8956A)' : '2px solid transparent',
                        marginBottom: -1,
                        cursor: 'pointer',
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : 'repeat(auto-fill, minmax(180px, 1fr))', gap: columns ? 8 : 12 }}>
            {filteredPosts.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                aria-label={p.caption ?? `Foto enviada por ${p.customerName ?? 'cliente'}`}
                className="ugc-card"
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  overflow: 'hidden',
                  borderRadius: 4,
                  background: 'var(--surface)',
                  border: 'none',
                  padding: 0,
                  cursor: 'zoom-in',
                  display: 'block',
                }}
              >
                <img
                  src={p.thumbnailUrl ?? p.imageUrl}
                  alt={p.caption ?? 'Foto enviada por cliente'}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                />
                <span
                  className="ugc-card__overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.65))',
                    color: 'white',
                    fontSize: 11,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'flex-start',
                    gap: 4,
                    opacity: p.customerName ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    textAlign: 'left',
                  }}
                >
                  {p.customerName && <strong style={{ fontWeight: 500 }}>{p.customerName}</strong>}
                  {p.productsTagged && p.productsTagged.length > 0 && (
                    <span style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.85 }}>
                      {p.productsTagged.length} {p.productsTagged.length === 1 ? 'peça marcada' : 'peças marcadas'}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <style>{`
            .ugc-card:hover img { transform: scale(1.04); }
            .ugc-card:hover .ugc-card__overlay { opacity: 1 !important; }
            .ugc-card:focus-visible { outline: 2px solid var(--accent, #B8956A); outline-offset: 2px; }
          `}</style>
          {lightboxIndex !== null && filteredPosts[lightboxIndex] && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Visualização da foto"
              onClick={() => setLightboxIndex(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 12, 8, 0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: 24,
                cursor: 'zoom-out',
              }}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
                aria-label="Fechar"
                style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer', padding: 8 }}
              >
                ×
              </button>
              <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 'min(900px, 90vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <img
                  src={filteredPosts[lightboxIndex].imageUrl}
                  alt={filteredPosts[lightboxIndex].caption ?? 'Foto ampliada'}
                  style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 4 }}
                />
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', maxWidth: 600 }}>
                  {filteredPosts[lightboxIndex].customerName && (
                    <p style={{ marginBottom: 4, fontWeight: 500 }}>{filteredPosts[lightboxIndex].customerName}</p>
                  )}
                  {filteredPosts[lightboxIndex].caption && (
                    <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{filteredPosts[lightboxIndex].caption}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
