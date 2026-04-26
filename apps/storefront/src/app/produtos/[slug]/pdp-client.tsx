'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '../../../components/ui/icon';
import { useCart } from '../../../components/cart/cart-provider';
import { useTracker } from '../../../components/tracker-provider';
import { HeartButton } from '../../../components/wishlist/heart-button';
import { useTrackRecentlyViewed } from '../../../components/products/recently-viewed';

type UrgencyKind = 'none' | 'viewing' | 'low-stock';

interface PDPVariant {
  id: string;
  sku: string;
  name?: string | null;
  priceCents?: number | null;
  stockQty: number;
  optionValues: Record<string, unknown>;
}

interface PDPImage {
  id: string;
  url: string;
  altText?: string | null;
  position: number;
}

interface PDPProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceCents: number;
  comparePriceCents?: number | null;
  warrantyMonths: number;
  customFields: Record<string, unknown>;
  seoTitle?: string | null;
}

interface PDPClientProps {
  product: PDPProduct;
  variants: PDPVariant[];
  images: PDPImage[];
  urgency: UrgencyKind;
  viewersNow: number;
  totalStock: number;
  currency: string;
}

function UrgencyBadge({ urgency, viewersNow, totalStock }: { urgency: UrgencyKind; viewersNow: number; totalStock: number }) {
  if (urgency === 'none') return null;
  if (urgency === 'low-stock' && totalStock > 0) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#FEF2E6', borderRadius: 4, padding: '8px 14px',
        marginTop: 20, fontSize: 13, color: '#9A5A1A',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: '#E07A1A', flexShrink: 0 }} />
        Restam apenas {totalStock} unidades
      </div>
    );
  }
  if (urgency === 'viewing' && viewersNow >= 3) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'var(--accent-soft)', borderRadius: 4, padding: '8px 14px',
        marginTop: 20, fontSize: 13, color: 'var(--accent)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)', flexShrink: 0 }} />
        {viewersNow} pessoas vendo agora
      </div>
    );
  }
  return null;
}

function Stars({ value = 5 }: { value?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon key={i} name={i <= value ? 'star-filled' : 'star'} size={14} style={{ color: 'var(--accent)' }} />
      ))}
    </div>
  );
}

function RestockButton({ productId, variantId }: { productId: string; variantId: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const tracker = useTracker();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    await fetch('/api/restock-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, variantId, email }),
    });
    tracker?.track({ type: 'restock_notify', entityType: 'product', entityId: productId });
    setSent(true);
  }

  if (sent) {
    return (
      <div style={{ flex: 1, padding: '14px 20px', fontSize: 14, textAlign: 'center', color: 'var(--accent)', border: '1px solid var(--divider)', borderRadius: 8 }}>
        ✓ Avisaremos quando voltar ao estoque
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: 8 }}>
      <input
        type="email"
        placeholder="Seu email para avisos"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{
          flex: 1, padding: '14px 16px', fontSize: 14, borderRadius: 8,
          border: '1px solid var(--divider)', background: 'var(--surface)',
          color: 'var(--text-primary)',
        }}
      />
      <button
        type="submit"
        style={{
          padding: '14px 20px', fontSize: 14, fontWeight: 500,
          background: 'transparent', color: 'var(--text-primary)',
          border: '1px solid var(--text-primary)', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Avise-me
      </button>
    </form>
  );
}

export function PDPClient({ product, variants, images, urgency, viewersNow, totalStock, currency }: PDPClientProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? '');
  const { addItem } = useCart();
  const tracker = useTracker();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledDepths = useRef<Set<number>>(new Set());

  // Track in localStorage 'recently viewed'
  useTrackRecentlyViewed({
    productId: product.id,
    slug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    imageUrl: images[0]?.url,
  });

  const selectedVariant = variants.find(v => v.id === selectedVariantId) ?? variants[0];
  const effectivePrice = selectedVariant?.priceCents ?? product.priceCents;
  const isOutOfStock = totalStock === 0 || (selectedVariant ? selectedVariant.stockQty <= 0 : false);

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });

  const discount = product.comparePriceCents && product.comparePriceCents > product.priceCents
    ? Math.round((1 - product.priceCents / product.comparePriceCents) * 100)
    : null;

  // Track product_view on mount
  useEffect(() => {
    tracker?.track({
      type: 'product_view',
      entityType: 'product',
      entityId: product.id,
    });
  }, [product.id, tracker]);

  // Track product_scroll at 25/50/75/100% depth
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !tracker) return;
    const THRESHOLDS = [0.25, 0.5, 0.75, 1.0];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          THRESHOLDS.forEach(t => {
            const pct = Math.round(t * 100);
            if (entry.intersectionRatio >= t && !scrolledDepths.current.has(pct)) {
              scrolledDepths.current.add(pct);
              tracker.track({
                type: 'product_scroll',
                entityType: 'product',
                entityId: product.id,
                metadata: { depth_pct: pct },
              });
            }
          });
        });
      },
      { threshold: THRESHOLDS }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product.id, tracker]);

  const handleGalleryThumb = useCallback((idx: number) => {
    setImgIdx(idx);
    if (idx === 0) {
      tracker?.track({ type: 'gallery_open', entityType: 'product', entityId: product.id });
    }
    tracker?.track({
      type: 'gallery_image_index',
      entityType: 'product',
      entityId: product.id,
      metadata: { index: idx },
    });
  }, [product.id, tracker]);

  function handleAddToCart() {
    if (!selectedVariant) return;
    addItem({
      id: selectedVariant.id,
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      slug: product.slug,
      priceCents: effectivePrice,
      options: Object.fromEntries(
        Object.entries(selectedVariant.optionValues).map(([k, v]) => [k, String(v)])
      ),
    });
    tracker?.track({ type: 'cart_add', entityType: 'product', entityId: product.id });
  }

  function handleVariantSelect(variantId: string) {
    setSelectedVariantId(variantId);
    tracker?.track({ type: 'variant_selected', entityType: 'variant', entityId: variantId });
  }

  const customFields = product.customFields;

  return (
    <div ref={scrollRef} style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '32px var(--container-pad) 80px' }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 32, display: 'flex', gap: 8 }}>
        <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <Link href="/produtos" style={{ color: 'var(--text-muted)' }}>Produtos</Link>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>{product.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 80 }}>
        {/* ── GALERIA ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Thumbnails */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(images.length > 0 ? images : [null, null, null, null]).map((img, i) => (
              <button
                key={i}
                onClick={() => handleGalleryThumb(i)}
                style={{
                  aspectRatio: '1/1', borderRadius: 4, overflow: 'hidden',
                  border: `1.5px solid ${imgIdx === i ? 'var(--text-primary)' : 'var(--divider)'}`,
                  cursor: 'pointer', background: 'var(--surface-sunken)', padding: 0,
                }}
              >
                {img ? (
                  <img src={img.url} alt={img.altText ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--surface-sunken)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Main image */}
          <div
            style={{
              aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden',
              background: 'var(--surface-sunken)', position: 'relative',
              cursor: images[imgIdx] ? 'zoom-in' : 'default',
            }}
            onClick={() => images[imgIdx] && tracker?.track({ type: 'gallery_open', entityType: 'product', entityId: product.id })}
          >
            {images[imgIdx] ? (
              <img
                src={images[imgIdx]!.url}
                alt={images[imgIdx]!.altText ?? product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #EDE8DE 0%, #D8D0C0 100%)',
                display: 'grid', placeItems: 'center',
              }}>
                <span style={{ fontSize: 48, color: 'var(--text-muted)' }}>◈</span>
              </div>
            )}
            {discount && (
              <span style={{
                position: 'absolute', top: 16, left: 16,
                background: 'var(--accent)', color: '#fff',
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 2,
              }}>
                -{discount}%
              </span>
            )}
          </div>
        </div>

        {/* ── INFO ── */}
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Joias Atelier</p>
          <h1 style={{ margin: '0 0 16px', lineHeight: 1.05 }}>{product.name}</h1>

          {/* Avaliações — só exibe quando houver reviews reais */}

          {/* Preço */}
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 32, fontFamily: 'var(--font-display)' }}>{formatPrice(effectivePrice)}</span>
            {product.comparePriceCents && (
              <span style={{ fontSize: 16, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 12 }}>
                {formatPrice(product.comparePriceCents)}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 0 }}>
            ou 6× de {formatPrice(Math.ceil(effectivePrice / 6))} sem juros
          </p>

          {/* Urgência — dados reais */}
          <UrgencyBadge urgency={urgency} viewersNow={viewersNow} totalStock={totalStock} />

          {/* Variantes */}
          {variants.length > 1 && (
            <div style={{ marginTop: 32 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Opção</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {variants.map(v => {
                  const label = Object.values(v.optionValues).join(' / ') || v.sku;
                  const selected = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleVariantSelect(v.id)}
                      disabled={v.stockQty <= 0}
                      style={{
                        padding: '8px 16px', fontSize: 14, cursor: v.stockQty <= 0 ? 'not-allowed' : 'pointer',
                        borderRadius: 4, border: `1px solid ${selected ? 'var(--text-primary)' : 'var(--divider)'}`,
                        background: selected ? 'var(--text-primary)' : 'var(--surface)',
                        color: selected ? 'var(--text-on-dark)' : v.stockQty <= 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                        opacity: v.stockQty <= 0 ? 0.5 : 1,
                        textDecoration: v.stockQty <= 0 ? 'line-through' : 'none',
                      }}
                    >
                      {String(label)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div style={{ marginTop: 36, display: 'flex', gap: 10, alignItems: 'center' }}>
            {isOutOfStock ? (
              <RestockButton productId={product.id} variantId={selectedVariantId} />
            ) : (
              <button
                onClick={handleAddToCart}
                style={{
                  flex: 1, padding: '14px 28px', fontSize: 14, fontWeight: 500,
                  background: 'var(--text-primary)', color: 'var(--text-on-dark)',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  transition: 'background 200ms',
                }}
              >
                Adicionar à sacola
              </button>
            )}
            <HeartButton
              productId={product.id}
              slug={product.slug}
              name={product.name}
              priceCents={effectivePrice}
              imageUrl={images[0]?.url}
              size={24}
              style={{ padding: 10, border: '1px solid var(--divider)', borderRadius: 8 }}
            />
          </div>

          {/* Campos do nicho */}
          {Object.keys(customFields).length > 0 && (
            <div style={{ marginTop: 32, padding: '20px 0', borderTop: '1px solid var(--divider)' }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Detalhes da peça</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                {Object.entries(customFields).map(([key, val]) => val ? (
                  <div key={key}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <p style={{ fontSize: 14, margin: '2px 0 0', color: 'var(--text-primary)' }}>{String(val)}</p>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* Descrição */}
          {product.description && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Garantia */}
          <div style={{ marginTop: 28, display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="shield" size={15} style={{ color: 'var(--accent)' }} />
              Garantia de {product.warrantyMonths} meses
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="truck" size={15} style={{ color: 'var(--accent)' }} />
              Frete grátis acima de R$ 500
            </div>
          </div>

          {/* Slots reservados para Sprint futuro */}
          <div style={{ marginTop: 32, padding: '12px 16px', background: 'var(--surface-sunken)', borderRadius: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            {/* Slot reservado · FBT + Related + UGC + Chatbot FAB — Sprint 9–11 */}
          </div>
        </div>
      </div>
    </div>
  );
}
