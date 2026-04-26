'use client';

import { useEffect, useRef, useState } from 'react';

interface UgcPost {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  customerName: string | null;
  productsTagged: Array<{ productId: string; x: number; y: number; label?: string }>;
  approvedAt: string | null;
}

export function UgcGallery({ productId }: { productId?: string }) {
  const [posts, setPosts] = useState<UgcPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [inViewport, setInViewport] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Intersection Observer — só faz fetch quando proximo do viewport
  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      // SSR / browser sem suporte: render direto
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
      { rootMargin: '300px' }, // pré-carregar 300px antes de entrar no viewport
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

  // Sentinel sempre renderizado (mesmo sem dados ainda) para ativar IntersectionObserver
  return (
    <section ref={ref} style={{ padding: '48px 0', minHeight: 1 }}>
      {loading ? (
        // Skeleton apenas quando temos sinal de viewport (evita flicker antes do hit)
        inViewport ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Comunidade
              </p>
              <div style={{ height: 32, width: 280, background: 'var(--surface)', borderRadius: 4 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '1', background: 'var(--surface)', borderRadius: 4 }} />
              ))}
            </div>
          </>
        ) : null
      ) : posts.length === 0 ? null : (
        <>
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Comunidade
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 400, fontFamily: 'var(--font-display)' }}>
              Como nossas clientes usam
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {posts.map(p => (
              <div key={p.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 4, background: 'var(--surface)' }}>
                <img
                  src={p.thumbnailUrl ?? p.imageUrl}
                  alt={p.caption ?? 'Foto enviada por cliente'}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {p.customerName && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '24px 8px 8px', color: 'white', fontSize: 11 }}>
                    {p.customerName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
