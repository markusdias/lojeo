'use client';

import Link from 'next/link';
import { useCart } from '../../components/cart/cart-provider';
import { Icon } from '../../components/ui/icon';
import { useTracker } from '../../components/tracker-provider';
import { FrequentlyBoughtTogetherCart } from '../../components/products/fbt-cart';
import { YouMayAlsoLikeCart } from '../../components/products/you-may-also-like-cart';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CURRENCY = 'BRL';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: CURRENCY });
}

function formatCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

export default function CartPage() {
  const { items, count, subtotalCents, removeItem, updateQty, clear } = useCart();
  const tracker = useTracker();
  const router = useRouter();

  const [cep, setCep] = useState('');
  const [shipping, setShipping] = useState<{ cents: number; days: string } | null>(null);
  const [cepError, setCepError] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    tracker?.track({ type: 'cart_view', entityType: 'cart', entityId: 'cart' });
  }, [tracker]);

  function calcShipping() {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setCepError('CEP inválido');
      setShipping(null);
      return;
    }
    setCepError('');
    // Estimativa local — cálculo definitivo no checkout
    setShipping({
      cents: subtotalCents >= 50000 ? 0 : 2800,
      days: '3 a 5 dias úteis',
    });
  }

  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponMsg({ kind: 'err', text: 'Informe um código' });
      return;
    }
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}&subtotalCents=${subtotalCents}`);
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponMsg({ kind: 'err', text: 'Cupom inválido — aplique no checkout' });
        return;
      }
      const exclusive = data.stackable === false;
      setCouponMsg({
        kind: 'ok',
        text: exclusive
          ? 'Cupom exclusivo — não combina com gift card ou afiliado. Aplique no checkout.'
          : 'Cupom válido — aplique no checkout',
      });
    } catch {
      setCouponMsg({ kind: 'err', text: 'Erro ao validar' });
    } finally {
      setCouponLoading(false);
    }
  }

  if (count === 0) {
    return (
      <div style={{
        maxWidth: 'var(--container-max)', margin: '0 auto',
        padding: '80px var(--container-pad)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 24 }}>◈</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1.05, margin: '0 0 16px' }}>Sua sacola está vazia</h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>
          Comece pelas peças mais queridas — voltam ao estoque toda semana.
        </p>
        <Link href="/produtos" style={{
          display: 'inline-block', padding: '14px 32px',
          background: 'var(--accent)', color: 'var(--text-on-accent, #fff)',
          fontSize: 14, fontWeight: 500, borderRadius: 'var(--r-button, 8px)',
        }}>
          Ver coleção
        </Link>
      </div>
    );
  }

  const shippingFreeAbove = 50000; // R$ 500
  const shippingGap = shippingFreeAbove - subtotalCents;
  const freeShipping = subtotalCents >= shippingFreeAbove;

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 80px' }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 40, display: 'flex', gap: 8 }}>
        <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
        <span>·</span>
        <span>Sacola</span>
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1.05, margin: 0 }}>Sua sacola</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 40, fontSize: 14 }}>
        {count} {count === 1 ? 'peça' : 'peças'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 64, alignItems: 'start' }}>
        {/* Items list */}
        <div>
          {/* Free shipping bar */}
          {!freeShipping && shippingGap > 0 && (
            <div style={{
              padding: '12px 16px', background: 'var(--surface-sunken)',
              borderRadius: 4, marginBottom: 32, fontSize: 13, color: 'var(--text-secondary)',
            }}>
              Faltam <strong>{formatPrice(shippingGap)}</strong> para frete grátis
            </div>
          )}
          {freeShipping && (
            <div style={{
              padding: '12px 16px', background: '#EDF7ED',
              borderRadius: 4, marginBottom: 32, fontSize: 13, color: '#1E6B22',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon name="truck" size={14} style={{ color: '#1E6B22' }} />
              Frete grátis aplicado!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {items.map((item, idx) => (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '120px 1fr',
                gap: 20, padding: '24px 0',
                borderTop: idx === 0 ? '1px solid var(--divider)' : undefined,
                borderBottom: '1px solid var(--divider)',
              }}>
                {/* Image — paridade ref Cart.jsx: 120px 1:1 com fundo cremoso */}
                <Link href={`/produtos/${item.slug}`}>
                  <div style={{
                    aspectRatio: '1/1', borderRadius: 6,
                    background: '#F4F1E9', overflow: 'hidden',
                  }}>
                    {item.imageUrl ? (
                      <img data-product-image src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div data-product-placeholder style={{
                        width: '100%', height: '100%',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>◈</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Link href={`/produtos/${item.slug}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, margin: 0, fontSize: 22, lineHeight: 1.15 }}>{item.name}</h3>
                    </Link>
                    <p style={{ fontSize: 16, fontFamily: 'var(--font-display)', margin: 0, flexShrink: 0, marginLeft: 16 }}>
                      {formatPrice(item.priceCents * item.qty)}
                    </p>
                  </div>

                  {item.options && Object.keys(item.options).length > 0 && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
                      {Object.entries(item.options).map(([, v]) => String(v).replace(/-/g, ' ')).join(' · ')}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12 }}>
                    {/* Qty controls */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 0,
                      border: '1px solid var(--divider)', borderRadius: 4, overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        style={{
                          width: 32, height: 32, fontSize: 18, lineHeight: 1,
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: item.qty <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span style={{
                        width: 32, textAlign: 'center', fontSize: 14,
                        borderLeft: '1px solid var(--divider)', borderRight: '1px solid var(--divider)',
                        lineHeight: '32px',
                      }}>
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        style={{
                          width: 32, height: 32, fontSize: 18, lineHeight: 1,
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-primary)',
                        }}
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: 'var(--text-muted)', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Icon name="trash" size={13} style={{ color: 'var(--text-muted)' }} />
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={clear}
            style={{
              marginTop: 16, fontSize: 13, color: 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            Limpar sacola
          </button>
        </div>

        {/* Order summary */}
        <div style={{
          background: 'var(--surface-sunken)', borderRadius: 8,
          padding: 28, position: 'sticky', top: 100,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '0 0 20px' }}>Resumo</h2>

          {/* CEP frete */}
          <div style={{ marginBottom: 20 }}>
            <div className="eyebrow" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>CEP</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={cep}
                onChange={e => { setCep(formatCep(e.target.value)); setCepError(''); }}
                placeholder="00000-000"
                inputMode="numeric"
                aria-label="CEP para cálculo de frete"
                style={{
                  flex: 1, padding: '10px 12px', border: '1px solid var(--divider)',
                  borderRadius: 2, fontSize: 14, background: 'var(--bg)',
                  fontFamily: 'var(--font-body)',
                }}
              />
              <button
                type="button"
                onClick={calcShipping}
                style={{
                  padding: '10px 14px', background: 'var(--text-primary)',
                  color: 'var(--text-on-dark)', border: 'none', borderRadius: 2,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Calcular
              </button>
            </div>
            {shipping && (
              <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 6 }}>
                {shipping.cents === 0 ? 'Frete grátis' : formatPrice(shipping.cents)} · {shipping.days}
              </div>
            )}
            {cepError && <div style={{ fontSize: 12, color: '#E53E3E', marginTop: 6 }}>{cepError}</div>}
          </div>

          {/* Cupom */}
          <div style={{ marginBottom: 20 }}>
            <div className="eyebrow" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>Cupom</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={coupon}
                onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponMsg(null); }}
                placeholder="ex: PRIMEIRACOMPRA"
                aria-label="Código de cupom"
                style={{
                  flex: 1, padding: '10px 12px', border: '1px solid var(--divider)',
                  borderRadius: 2, fontSize: 14, background: 'var(--bg)',
                  fontFamily: 'var(--font-body)', textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponLoading}
                style={{
                  padding: '10px 14px', background: 'transparent',
                  color: 'var(--text-primary)', border: '1px solid var(--text-primary)',
                  borderRadius: 2, fontSize: 13,
                  cursor: couponLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {couponLoading ? '...' : 'Aplicar'}
              </button>
            </div>
            {couponMsg && (
              <div style={{
                fontSize: 12, marginTop: 6,
                color: couponMsg.kind === 'ok' ? 'var(--success)' : '#E53E3E',
              }}>
                {couponMsg.text}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Frete</span>
              <span style={{ color: shipping?.cents === 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                {shipping ? (shipping.cents === 0 ? 'grátis' : formatPrice(shipping.cents)) : 'calcular'}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--divider)', margin: '16px 0 0', paddingTop: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '6px 0',
              fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--text-primary)',
            }}>
              <span>Total</span>
              <span>{formatPrice(subtotalCents + (shipping?.cents ?? 0))}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              ou 6× {formatPrice(Math.ceil((subtotalCents + (shipping?.cents ?? 0)) / 6))} sem juros
            </p>
          </div>

          {/* Checkout CTA */}
          <button
            type="button"
            style={{
              width: '100%', padding: '15px 24px', marginTop: 20,
              background: 'var(--accent)', color: 'var(--text-on-accent, #fff)',
              fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 'var(--r-button, 8px)',
              cursor: 'pointer',
            }}
            onClick={() => {
              tracker?.track({ type: 'checkout_start', entityType: 'cart', entityId: 'cart' });
              router.push('/checkout/endereco');
            }}
          >
            Finalizar compra
          </button>

          <Link href="/produtos" style={{
            display: 'block', textAlign: 'center', marginTop: 16,
            fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
            borderBottom: '1px solid currentColor', paddingBottom: 4,
            width: 'fit-content', marginInline: 'auto',
          }}>
            continuar comprando
          </Link>

          {/* Trust row */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: 'shield', text: 'Garantia de 12 meses' },
              { icon: 'truck', text: 'Frete grátis acima de R$ 500' },
              { icon: 'check', text: 'Devolução em 30 dias' },
            ].map(t => (
              <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <Icon name={t.icon as Parameters<typeof Icon>[0]['name']} size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FBT carrinho — pares de pedidos pagos */}
      <FrequentlyBoughtTogetherCart
        cartProductIds={items.map(i => i.productId)}
        eyebrow="Frequentemente comprados juntos"
        title="Combina com seu carrinho"
        marginTop={120}
      />

      {/* YouMayAlsoLike — afinidade por coleção/categoria */}
      <YouMayAlsoLikeCart
        cartProductIds={items.map(i => i.productId)}
        marginTop={64}
      />
    </div>
  );
}
