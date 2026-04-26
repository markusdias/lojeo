'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const url = productId ? `/api/ugc/gallery?productId=${productId}&limit=12` : '/api/ugc/gallery?limit=24';
    fetch(url)
      .then(r => r.json())
      .then((d: { posts: UgcPost[] }) => { setPosts(d.posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) return null;
  if (posts.length === 0) return null;

  return (
    <section style={{ padding: '48px 0' }}>
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
          <div key={p.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 4 }}>
            <img
              src={p.thumbnailUrl ?? p.imageUrl}
              alt={p.caption ?? 'Foto enviada por cliente'}
              loading="lazy"
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
    </section>
  );
}
