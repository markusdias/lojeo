'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '../../../components/ui/icon';
import { useCart } from '../../../components/cart/cart-provider';
import { useTracker } from '../../../components/tracker-provider';
import { HeartButton } from '../../../components/wishlist/heart-button';
import { useTrackRecentlyViewed } from '../../../components/products/recently-viewed';
import { trackPixelEvent } from '../../../components/marketing/pixel-events';
import { VariantPicker, detectJewelryKind } from './variant-picker';
import { StickyBuyBar } from './sticky-buy-bar';
import { ShippingCalc } from './shipping-calc';

/**
 * Mapa kind (jewelry detection) → categoria slug + label.
 * Usado em breadcrumb (Home > Categoria > Produto) e eyebrow,
 * espelhando ref jewelry-v1 PDP.jsx (Breadcrumbs + eyebrow categoria).
 * Slugs casam com PLP (/produtos?categoria=<slug>) — aneis/colares/brincos.
 */
const CATEGORY_FROM_KIND: Record<string, { slug: string; label: string }> = {
  anel: { slug: 'aneis', label: 'Anéis' },
  colar: { slug: 'colares', label: 'Colares' },
  brinco: { slug: 'brincos', label: 'Brincos' },
};

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
  reviewAvg: number;
  reviewTotal: number;
}

/**
 * Stars — versão compacta read-only para o header da PDP.
 * Match ref jewelry-v1: 5 estrelas champagne (#C9A85C) + cinza claro vazias.
 */
function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span aria-label={`${value.toFixed(1)} de 5 estrelas`} style={{ display: 'inline-flex', gap: 2, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= rounded ? '#C9A85C' : 'var(--divider)', fontSize: 14 }}>★</span>
      ))}
    </span>
  );
}

/**
 * MaterialSwatches — match ref jewelry-v1.
 * Detecta o material atual em customFields (string) e mostra como botão circular 36x36
 * com swatch de cor. A loja apenas exibe o material já cadastrado — não há troca real
 * de variante por material (preserva contrato API). Se outras opções existirem em
 * customFields.materialOptions (array), também são listadas como swatches secundárias.
 */
const MATERIAL_SWATCHES: Record<string, { label: string; swatch: string }> = {
  ouro: { label: 'Ouro 18k', swatch: '#D4B896' },
  'ouro 18k': { label: 'Ouro 18k', swatch: '#D4B896' },
  'ouro-18k': { label: 'Ouro 18k', swatch: '#D4B896' },
  prata: { label: 'Prata 925', swatch: '#C8CDD3' },
  'prata 925': { label: 'Prata 925', swatch: '#C8CDD3' },
  'rose-gold': { label: 'Ouro Rosé', swatch: '#C8A28C' },
  'ouro rosé': { label: 'Ouro Rosé', swatch: '#C8A28C' },
  'ouro rose': { label: 'Ouro Rosé', swatch: '#C8A28C' },
  cobre: { label: 'Cobre', swatch: '#A96B3F' },
  copper: { label: 'Cobre', swatch: '#A96B3F' },
};

function normalizeMaterialKey(s: string): string {
  return s.trim().toLowerCase();
}

function MaterialSwatches({ customFields }: { customFields: Record<string, unknown> }) {
  const raw = customFields.material ?? customFields.metal ?? customFields.materia;
  const optionsRaw = customFields.materialOptions ?? customFields.materiais;
  const options: string[] = Array.isArray(optionsRaw)
    ? optionsRaw.filter((x): x is string => typeof x === 'string')
    : typeof raw === 'string'
      ? [raw]
      : [];

  if (options.length === 0) return null;

  const swatches = options
    .map(opt => {
      const key = normalizeMaterialKey(opt);
      const known = MATERIAL_SWATCHES[key];
      return known
        ? { key, ...known }
        : { key, label: opt, swatch: 'var(--surface-sunken)' };
    })
    // dedupe por key
    .filter((s, i, arr) => arr.findIndex(x => x.key === s.key) === i);

  return (
    <div style={{ marginTop: 32 }}>
      <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>
        Material
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        {swatches.map((s, i) => (
          <button
            key={s.key}
            type="button"
            title={s.label}
            aria-label={s.label}
            // Primeira swatch fica "ativa" — match ref (loja não troca variante por material aqui).
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: s.swatch,
              border: '1px solid var(--divider)',
              cursor: 'default',
              outline: i === 0 ? '1.5px solid var(--text-primary)' : 'none',
              outlineOffset: 2,
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * NicheFields — dl em duas colunas (120px label uppercase + 1fr value), com divider entre rows.
 * Match ref jewelry-v1 PDP.jsx::NicheFields. Renderiza apenas linhas com valor presente.
 */
const NICHE_FIELD_LABELS: Record<string, string> = {
  material: 'Material',
  metal: 'Material',
  pedra: 'Pedra',
  stone: 'Pedra',
  quilate: 'Quilate',
  carat: 'Quilate',
  origem: 'Origem',
  origin: 'Origem',
  tamanho: 'Tamanho',
  size: 'Tamanho',
  aro: 'Aro',
  acabamento: 'Acabamento',
  finish: 'Acabamento',
  comprimento: 'Comprimento',
  length: 'Comprimento',
  fecho: 'Fecho',
  closure: 'Fecho',
  embalagem: 'Embalagem',
  packaging: 'Embalagem',
  garantia: 'Garantia',
  warranty: 'Garantia',
};

const NICHE_FIELD_ORDER = [
  'material', 'metal', 'pedra', 'stone', 'quilate', 'carat',
  'tamanho', 'size', 'aro', 'comprimento', 'length',
  'fecho', 'closure', 'acabamento', 'finish',
  'origem', 'origin', 'embalagem', 'packaging',
  'garantia', 'warranty',
];

function NicheFields({ customFields, warrantyMonths }: { customFields: Record<string, unknown>; warrantyMonths: number }) {
  const rows: Array<{ key: string; value: string }> = [];
  const seenLabels = new Set<string>();

  for (const k of NICHE_FIELD_ORDER) {
    const raw = customFields[k];
    if (raw === undefined || raw === null || raw === '') continue;
    const label = NICHE_FIELD_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    rows.push({ key: label, value: String(raw) });
  }

  // Linhas extras presentes em customFields que não estão no ORDER conhecido.
  for (const [k, v] of Object.entries(customFields)) {
    if (NICHE_FIELD_ORDER.includes(k)) continue;
    if (k === 'materialOptions' || k === 'materiais') continue;
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') continue;
    const label = k.charAt(0).toUpperCase() + k.slice(1);
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    rows.push({ key: label, value: String(v) });
  }

  // Garantia derivada de warrantyMonths se ainda não houver
  if (!seenLabels.has('Garantia') && warrantyMonths > 0) {
    rows.push({
      key: 'Garantia',
      value: `${warrantyMonths} ${warrantyMonths === 1 ? 'mês' : 'meses'} contra defeitos de fabricação`,
    });
  }
  if (!seenLabels.has('Embalagem')) {
    rows.push({ key: 'Embalagem', value: 'Caixa Atelier inclusa' });
  }

  if (rows.length === 0) return null;

  return (
    <dl style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--divider)', fontSize: 13, margin: '36px 0 0' }}>
      {rows.map(r => (
        <div
          key={r.key}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            padding: '10px 0',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <dt style={{
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontSize: 11,
          }}>
            {r.key}
          </dt>
          <dd style={{ margin: 0, color: 'var(--text-primary)' }}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * UrgencyBadge — telemetria real apenas. Estados:
 *   - none: sem badge (default)
 *   - viewing: pill subtle "X pessoas vendo agora" (info) — distinct anon nos últimos 60min
 *   - low-stock: pill warning "Restam apenas N unidades" — qty - reserved <= 3
 *
 * O servidor (page.tsx) já decide qual estado renderizar usando dados reais do DB.
 * Aqui apenas refletimos visualmente; nunca falsificar números no client.
 */
function UrgencyBadge({ urgency, viewersNow, totalStock }: { urgency: UrgencyKind; viewersNow: number; totalStock: number }) {
  if (urgency === 'low-stock' && totalStock > 0) {
    return (
      <div
        role="status"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#FEF2E6', borderRadius: 999, padding: '6px 14px',
          marginTop: 20, fontSize: 13, color: '#9A5A1A', fontWeight: 500,
          border: '1px solid #F2D9B8',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 999, background: '#E07A1A', flexShrink: 0 }} />
        Restam apenas {totalStock} {totalStock === 1 ? 'unidade' : 'unidades'}
      </div>
    );
  }
  if (urgency === 'viewing' && viewersNow > 0) {
    return (
      <div
        role="status"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', borderRadius: 999, padding: '6px 14px',
          marginTop: 20, fontSize: 13, color: 'var(--text-secondary)',
          border: '1px solid var(--divider)',
        }}
      >
        <span
          style={{
            width: 6, height: 6, borderRadius: 999,
            background: 'var(--success, #4A8A3F)', flexShrink: 0,
            boxShadow: '0 0 0 0 var(--success, #4A8A3F)',
            animation: 'lojeoPulse 2s infinite',
          }}
        />
        {viewersNow} {viewersNow === 1 ? 'pessoa vendo' : 'pessoas vendo'} agora
      </div>
    );
  }
  return null;
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
      <div style={{ flex: 1, padding: '14px 20px', fontSize: 14, textAlign: 'center', color: 'var(--success, #5C7A4A)', background: 'var(--success-bg, #EEF2E8)', border: '1px solid var(--success, #5C7A4A)', borderRadius: 8 }}>
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

export function PDPClient({ product, variants, images, urgency, viewersNow, totalStock, currency, reviewAvg, reviewTotal }: PDPClientProps) {
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

  // Pixel event: ViewContent (uma vez ao montar PDP)
  useEffect(() => {
    trackPixelEvent('ViewContent', {
      value: product.priceCents,
      currency: 'BRL',
      content_ids: [product.id],
      content_type: 'product',
    });
  }, [product.id]);

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
  // Categoria detectada a partir de customFields/slug — match ref jewelry-v1 (Breadcrumbs + eyebrow).
  // Reaproveita detectJewelryKind (testado em variant-picker.test.ts).
  const jewelryKind = detectJewelryKind(product.slug, customFields);
  const category = jewelryKind !== 'unknown' ? CATEGORY_FROM_KIND[jewelryKind] : null;

  return (
    <div ref={scrollRef} style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '32px var(--container-pad) 80px' }}>
      {/* Breadcrumbs — Home > Categoria > Produto (match ref jewelry-v1).
          Quando categoria não identificada, fallback para link genérico /produtos. */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 32, display: 'flex', gap: 8 }}>
        <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        {category ? (
          <Link href={`/produtos?categoria=${category.slug}`} style={{ color: 'var(--text-muted)' }}>
            {category.label}
          </Link>
        ) : (
          <Link href="/produtos" style={{ color: 'var(--text-muted)' }}>Produtos</Link>
        )}
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

          {/* Main image — aspectRatio 1/1 (match ref jewelry-v1) */}
          <div
            data-product-image
            style={{
              aspectRatio: '1/1', borderRadius: 'var(--r-image, 8px)', overflow: 'hidden',
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
              <div data-product-placeholder style={{
                width: '100%', height: '100%',
                display: 'grid', placeItems: 'center',
              }}>
                <span style={{ fontSize: 48, color: 'var(--text-muted)' }}>◈</span>
              </div>
            )}
            {discount && (
              <span style={{
                position: 'absolute', top: 16, left: 16,
                background: 'var(--promo-bg, var(--warning, #B8853A))', color: '#fff',
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 2,
              }}>
                -{discount}%
              </span>
            )}
            {/* Zoom button — affordance visual absoluto bottom-right (match ref jewelry-v1).
                Só aparece quando há imagem real. Click é capturado pelo wrapper com onClick acima. */}
            {images[imgIdx] && (
              <button
                type="button"
                aria-label="Ampliar imagem"
                onClick={(e) => {
                  e.stopPropagation();
                  tracker?.track({ type: 'gallery_open', entityType: 'product', entityId: product.id });
                }}
                style={{
                  position: 'absolute', bottom: 16, right: 16,
                  width: 44, height: 44, borderRadius: 999,
                  background: 'rgba(255,255,255,0.95)', border: 'none',
                  cursor: 'pointer', color: 'var(--text-primary)',
                  display: 'grid', placeItems: 'center',
                  boxShadow: '0 2px 8px rgba(26,22,18,0.08)',
                }}
              >
                <Icon name="zoom" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ── INFO ── */}
        <div>
          {/* Eyebrow — categoria detectada (match ref jewelry-v1) ou fallback "Atelier". */}
          <p className="eyebrow" style={{ marginBottom: 8 }}>{category?.label ?? 'Atelier'}</p>
          <h1 style={{ margin: '0 0 16px', lineHeight: 1.05 }}>{product.name}</h1>

          {/* Avaliações — só exibe quando houver reviews aprovados (telemetria real) */}
          {reviewTotal > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: -4, marginBottom: 18 }}>
              <Stars value={reviewAvg} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {reviewAvg.toFixed(1)} · {reviewTotal} {reviewTotal === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>
          )}

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

          {/* Material swatches — match ref jewelry-v1 (Ouro/Prata/Rosé/Cobre) */}
          <MaterialSwatches customFields={customFields} />

          {/* Variantes — chips por tipo de joia (anel/colar/brinco) ou select genérico */}
          {variants.length > 1 && (
            <VariantPicker
              productSlug={product.slug}
              customFields={customFields}
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelect={handleVariantSelect}
            />
          )}

          {/* CTAs */}
          <div data-sticky-buy-anchor style={{ marginTop: 36, display: 'flex', gap: 10, alignItems: 'center' }}>
            {isOutOfStock ? (
              <RestockButton productId={product.id} variantId={selectedVariantId} />
            ) : (
              <button
                onClick={handleAddToCart}
                style={{
                  flex: 1, padding: '14px 28px', fontSize: 14, fontWeight: 500,
                  background: 'var(--accent)', color: 'var(--text-on-accent, #fff)',
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

          {/* Campos do nicho — dl 120px/1fr com divider entre rows (match ref jewelry-v1) */}
          <NicheFields customFields={customFields} warrantyMonths={product.warrantyMonths} />

          {/* Descrição */}
          {product.description && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Trust signals com ícone — Garantia + Embalagem detalhadas vivem na dl NicheFields acima.
              Aqui mantemos só o trust visual de frete grátis (CTA mais imediato). */}
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <Icon name="truck" size={15} style={{ color: 'var(--accent)' }} />
            <span>Frete grátis acima de R$ 500</span>
          </div>

          {/* Calculadora inline de prazo e frete por CEP */}
          <ShippingCalc priceCents={effectivePrice} currency={currency} />
        </div>
      </div>

      {/* Sticky add-to-cart bar (mobile only — aparece quando o CTA principal sai do viewport) */}
      <StickyBuyBar
        productName={product.name}
        priceLabel={formatPrice(effectivePrice)}
        isOutOfStock={isOutOfStock}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
