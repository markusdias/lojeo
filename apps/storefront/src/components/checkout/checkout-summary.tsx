'use client';

import Link from 'next/link';
import { useCart } from '../cart/cart-provider';

const CURRENCY = 'BRL';
const FREE_SHIPPING_ABOVE = 50000;

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: CURRENCY });
}

interface CheckoutSummaryProps {
  subtotalCents: number;
  shippingCents?: number;
  discountCents?: number;
  freeShipping?: boolean;
}

export function CheckoutSummary({ subtotalCents, shippingCents = 0, discountCents = 0, freeShipping: freeShippingProp }: CheckoutSummaryProps) {
  const { items, count } = useCart();
  const freeShipping = freeShippingProp ?? subtotalCents >= FREE_SHIPPING_ABOVE;
  const effectiveShipping = freeShipping ? 0 : shippingCents;
  const total = Math.max(0, subtotalCents - discountCents + effectiveShipping);

  return (
    <div style={{
      background: 'var(--surface-sunken)',
      border: '1px solid var(--divider)', borderRadius: 8,
      padding: 28, position: 'sticky', top: 100,
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400,
        margin: '0 0 6px',
      }}>
        Seu pedido
      </h3>
      <p style={{
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-secondary)', margin: '0 0 18px',
      }}>
        {count} {count === 1 ? 'peça' : 'peças'}
      </p>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid var(--divider)' }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 48, aspectRatio: '3/4', borderRadius: 4, flexShrink: 0,
              background: 'var(--surface-sunken)', overflow: 'hidden',
            }}>
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </p>
              {item.options && Object.keys(item.options).length > 0 && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {Object.values(item.options).join(' · ')}
                </p>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>× {item.qty}</p>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, flexShrink: 0 }}>
              {fmt(item.priceCents * item.qty)}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
          <span>{fmt(subtotalCents)}</span>
        </div>
        {discountCents > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Desconto</span>
            <span style={{ color: 'var(--success)' }}>-{fmt(discountCents)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Frete</span>
          <span style={{ color: freeShipping ? 'var(--success)' : 'var(--text-primary)' }}>
            {shippingCents === undefined ? 'Calculado no próximo passo' :
              freeShipping ? 'Grátis' : fmt(effectiveShipping)}
          </span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          borderTop: '1px solid var(--divider)', paddingTop: 12, marginTop: 4,
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400 }}>
            {shippingCents === undefined ? fmt(subtotalCents) : fmt(total)}
          </span>
        </div>
      </div>

      <Link href="/carrinho" style={{
        display: 'block', textAlign: 'center', marginTop: 16,
        fontSize: 12, color: 'var(--text-muted)',
      }}>
        Editar sacola
      </Link>
    </div>
  );
}
