'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTracker } from '../tracker-provider';

interface UgcPost {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  customerName: string | null;
  productsTagged: Array<{ productId: string; x: number; y: number; label?: string }>;
  approvedAt: string | null;
}

interface TaggedProductData {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  image: { url: string; altText: string | null } | null;
}

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
  const [taggedProducts, setTaggedProducts] = useState<Record<string, TaggedProductData>>({});
  const [openPinIdx, setOpenPinIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tracker = useTracker();
  const impressionTrackedRef = useRef<Set<string>>(new Set());

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
      if (e.key === 'Escape') {
        if (openPinIdx !== null) setOpenPinIdx(null);
        else setLightboxIndex(null);
      }
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i === null ? null : Math.min(i + 1, filteredPosts.length - 1)));
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i === null ? null : Math.max(i - 1, 0)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, filteredPosts.length, openPinIdx]);

  // Reset pin aberto ao trocar de post
  useEffect(() => {
    setOpenPinIdx(null);
  }, [lightboxIndex]);

  // Click fora do hover-card ou do pin fecha o aberto (mobile)
  useEffect(() => {
    if (openPinIdx === null) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.ugc-pin-wrap')) return;
      setOpenPinIdx(null);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [openPinIdx]);

  // Pré-carrega dados dos produtos taggeados no post atual do lightbox
  const currentPost = lightboxIndex !== null ? filteredPosts[lightboxIndex] : null;
  const currentTaggedIds = useMemo(() => {
    if (!currentPost) return [] as string[];
    return (currentPost.productsTagged ?? []).map(t => t.productId);
  }, [currentPost]);

  useEffect(() => {
    if (currentTaggedIds.length === 0) return;
    const missing = currentTaggedIds.filter(id => !taggedProducts[id]);
    if (missing.length === 0) return;
    const ctrl = new AbortController();
    fetch(`/api/products/by-ids?ids=${missing.join(',')}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((d: { products?: TaggedProductData[] }) => {
        if (!d.products) return;
        setTaggedProducts(prev => {
          const next = { ...prev };
          for (const p of d.products!) next[p.id] = p;
          return next;
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [currentTaggedIds, taggedProducts]);

  // Tracking impression — uma vez por post com pins
  useEffect(() => {
    if (!tracker || !currentPost) return;
    if (currentTaggedIds.length === 0) return;
    if (impressionTrackedRef.current.has(currentPost.id)) return;
    impressionTrackedRef.current.add(currentPost.id);
    tracker.track({
      type: 'recommendation_impression',
      entityType: 'ugc_post',
      entityId: currentPost.id,
      metadata: {
        source: 'ugc_tag',
        count: currentTaggedIds.length,
        productIds: currentTaggedIds,
      },
    });
  }, [tracker, currentPost, currentTaggedIds]);

  function handlePinClick(productId: string, position: number) {
    if (!tracker || !currentPost) return;
    tracker.track({
      type: 'recommendation_click',
      entityType: 'product',
      entityId: productId,
      metadata: {
        source: 'ugc_tag',
        ugcPostId: currentPost.id,
        position,
      },
    });
  }

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
            @keyframes ugc-pin-pulse {
              0%, 100% { box-shadow: 0 1px 4px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.5); }
              50% { box-shadow: 0 1px 4px rgba(0,0,0,0.35), 0 0 0 6px rgba(255,255,255,0.25); }
            }
            .ugc-pin:focus-visible { outline: 2px solid var(--accent, #B8956A); outline-offset: 3px; }
            .ugc-hover-card { opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
            .ugc-hover-card--open { opacity: 1; pointer-events: auto; }
            .ugc-pin-wrap:hover .ugc-hover-card,
            .ugc-pin-wrap:focus-within .ugc-hover-card { opacity: 1; pointer-events: auto; }
            @media (max-width: 640px) {
              .ugc-hover-card { display: none; }
              .ugc-hover-card--open {
                display: block;
                position: fixed !important;
                left: 16px !important;
                right: 16px !important;
                top: 16px !important;
                bottom: auto !important;
                transform: none !important;
                max-width: none !important;
                z-index: 110 !important;
              }
            }
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
                <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '75vh', display: 'inline-block' }}>
                  <img
                    src={filteredPosts[lightboxIndex].imageUrl}
                    alt={filteredPosts[lightboxIndex].caption ?? 'Foto ampliada'}
                    style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 4, display: 'block' }}
                  />
                  {(filteredPosts[lightboxIndex].productsTagged ?? []).map((tag, i) => {
                    const data = taggedProducts[tag.productId];
                    const open = openPinIdx === i;
                    const labelText = tag.label ?? data?.name ?? 'produto';
                    const ariaLabel = `Tag ${labelText} em ${Math.round(tag.x)}%, ${Math.round(tag.y)}%`;
                    return (
                      <div
                        key={`${tag.productId}-${i}`}
                        className="ugc-pin-wrap"
                        style={{
                          position: 'absolute',
                          left: `${tag.x}%`,
                          top: `${tag.y}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <button
                          type="button"
                          className="ugc-pin"
                          aria-label={ariaLabel}
                          aria-expanded={open}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPinIdx(prev => (prev === i ? null : i));
                          }}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'white',
                            border: 'none',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.5)',
                            color: 'var(--accent, #B8956A)',
                            fontSize: 16,
                            fontWeight: 600,
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            animation: 'ugc-pin-pulse 2s ease-in-out infinite',
                          }}
                        >
                          <span aria-hidden>+</span>
                        </button>
                        <div
                            role="dialog"
                            aria-label={`Detalhe do produto ${data?.name ?? labelText}`}
                            className={`ugc-hover-card${open ? ' ugc-hover-card--open' : ''}`}
                            style={{
                              position: 'absolute',
                              left: '50%',
                              bottom: 'calc(100% + 10px)',
                              transform: 'translateX(-50%)',
                              minWidth: 200,
                              maxWidth: 240,
                              background: 'white',
                              color: 'var(--ink, #1a1a1a)',
                              borderRadius: 4,
                              padding: 12,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                              zIndex: 2,
                            }}
                          >
                            {data ? (
                              <>
                                {data.image && (
                                  <img
                                    src={data.image.url}
                                    alt={data.image.altText ?? data.name}
                                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 2, marginBottom: 8, background: 'var(--surface, #f5f0e8)' }}
                                  />
                                )}
                                <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>{data.name}</p>
                                <p style={{ fontSize: 13, marginBottom: 8 }}>{fmtBRL(data.priceCents)}</p>
                                <a
                                  href={`/produtos/${data.slug}`}
                                  onClick={() => handlePinClick(data.id, i)}
                                  style={{
                                    display: 'inline-block',
                                    fontSize: 11,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: 'var(--accent, #B8956A)',
                                    textDecoration: 'none',
                                    borderBottom: '1px solid var(--accent, #B8956A)',
                                    paddingBottom: 1,
                                  }}
                                >
                                  Ver produto →
                                </a>
                              </>
                            ) : (
                              <p style={{ fontSize: 12, color: 'var(--text-muted, #777)' }}>Carregando…</p>
                            )}
                          </div>
                      </div>
                    );
                  })}
                </div>
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
