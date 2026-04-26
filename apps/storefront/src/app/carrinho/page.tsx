'use client';

import Link from 'next/link';
import { useCart } from '../../components/cart/cart-provider';
import { Icon } from '../../components/ui/icon';
import { useTracker } from '../../components/tracker-provider';
import { FrequentlyBoughtTogetherCart } from '../../components/products/fbt-cart';
import { useEffect } from 'react';

const CURRENCY = 'BRL';

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: CURRENCY });
}

export default function CartPage() {
  const { items, count, subtotalCents, removeItem, updateQty, clear } = useCart();
  const tracker = useTracker();

  useEffect(() => {
    tracker?.track({ type: 'cart_view', entityType: 'cart', entityId: 'cart' });
  }, [tracker]);

  if (count === 0) {
    return (
      <div style={{
        maxWidth: 'var(--container-max)', margin: '0 auto',
        padding: '80px var(--container-pad)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 24 }}>◈</span>
        <h1 style={{ marginBottom: 16 }}>Sua sacola está vazia</h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>
          Explore nossas peças e encontre algo especial.
        </p>
        <Link href="/produtos" style={{
          display: 'inline-block', padding: '14px 32px',
          background: 'var(--text-primary)', color: 'var(--text-on-dark)',
          fontSize: 14, fontWeight: 500, borderRadius: 8,
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

      <h1 style={{ marginBottom: 40 }}>Sacola ({count} {count === 1 ? 'item' : 'itens'})</h1>

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
                display: 'grid', gridTemplateColumns: '88px 1fr',
                gap: 20, padding: '24px 0',
                borderTop: idx === 0 ? '1px solid var(--divider)' : undefined,
                borderBottom: '1px solid var(--divider)',
              }}>
                {/* Image */}
                <Link href={`/produtos/${item.slug}`}>
                  <div style={{
                    aspectRatio: '3/4', borderRadius: 4,
                    background: 'var(--surface-sunken)', overflow: 'hidden',
                  }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, #EDE8DE 0%, #D8D0C0 100%)',
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
                      <p style={{ fontWeight: 500, margin: 0, fontSize: 15 }}>{item.name}</p>
                    </Link>
                    <p style={{ fontSize: 15, fontWeight: 500, margin: 0, flexShrink: 0, marginLeft: 16 }}>
                      {formatPrice(item.priceCents * item.qty)}
                    </p>
                  </div>

                  {item.options && Object.keys(item.options).length > 0 && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
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
          border: '1px solid var(--divider)', borderRadius: 8,
          padding: 28, position: 'sticky', top: 100,
        }}>
          <h2 style={{ fontSize: 18, marginBottom: 24 }}>Resumo do pedido</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal ({count} {count === 1 ? 'item' : 'itens'})</span>
              <span>{formatPrice(subtotalCents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Frete</span>
              <span style={{ color: freeShipping ? '#1E6B22' : 'var(--text-secondary)' }}>
                {freeShipping ? 'Grátis' : 'Calculado no checkout'}
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 16, fontWeight: 600,
            borderTop: '1px solid var(--divider)', paddingTop: 16, marginBottom: 24,
          }}>
            <span>Total</span>
            <span>{formatPrice(subtotalCents)}</span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            ou {count > 0 ? `6× de ${formatPrice(Math.ceil(subtotalCents / 6))} sem juros` : ''}
          </p>

          {/* Checkout CTA — Sprint 5 wires real payment */}
          <button
            style={{
              width: '100%', padding: '15px 24px',
              background: 'var(--text-primary)', color: 'var(--text-on-dark)',
              fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 8,
              cursor: 'pointer', marginBottom: 12,
            }}
            onClick={() => {
              tracker?.track({ type: 'checkout_start', entityType: 'cart', entityId: 'cart' });
              alert('Checkout em breve — Sprint 5');
            }}
          >
            Finalizar compra
          </button>

          <Link href="/produtos" style={{
            display: 'block', textAlign: 'center', padding: '12px 24px',
            border: '1px solid var(--divider)', borderRadius: 8,
            fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
          }}>
            Continuar comprando
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

      {/* FBT carrinho — Sprint 11 v2 */}
      <FrequentlyBoughtTogetherCart cartProductIds={items.map(i => i.productId)} />
    </div>
  );
}
