'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckout } from '../../../components/checkout/checkout-provider';
import { useCart } from '../../../components/cart/cart-provider';
import { useTracker } from '../../../components/tracker-provider';
import { CheckoutSummary } from '../../../components/checkout/checkout-summary';
import { Icon } from '../../../components/ui/icon';
import { trackPixelEvent } from '../../../components/marketing/pixel-events';
import { getPixDiscountPct, applyPixDiscount, pixDiscountAmountCents } from '../../../lib/checkout-config';

const CURRENCY = 'BRL';
const FREE_SHIPPING_ABOVE = 50000;

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: CURRENCY });
}

const COUPON_REASON_PT: Record<string, string> = {
  not_found: 'Cupom não encontrado',
  inactive: 'Cupom inativo',
  not_started: 'Cupom ainda não iniciou',
  expired: 'Cupom expirado',
  exhausted: 'Cupom esgotado',
  max_uses_reached: 'Cupom esgotado',
  below_minimum: 'Pedido abaixo do mínimo exigido',
  min_order_not_met: 'Pedido abaixo do mínimo exigido',
  invalid_code: 'Código inválido',
};

function couponReasonPT(reason: string | undefined, minOrderCents: number | undefined): string {
  if (!reason) return 'Cupom inválido';
  if ((reason === 'below_minimum' || reason === 'min_order_not_met') && minOrderCents) {
    return `Pedido mínimo ${(minOrderCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  }
  return COUPON_REASON_PT[reason] ?? 'Cupom inválido';
}

export default function PagamentoPage() {
  const router = useRouter();
  const { state, setPaymentMethod, setGift, setOrder, setStep, setCoupon } = useCheckout();
  const { subtotalCents, items, clear } = useCart();
  const tracker = useTracker();
  const [method, setMethod] = useState<'pix' | 'credit_card' | 'boleto'>(state.paymentMethod ?? 'pix');
  const [isGift, setIsGift] = useState(state.isGift);
  const [giftMessage, setGiftMessage] = useState(state.giftMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponInput, setCouponInput] = useState(state.coupon?.code ?? '');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    if (!state.address.postalCode || !state.shipping) {
      router.push('/checkout/endereco');
      return;
    }
    tracker?.track({ type: 'checkout_step_start', entityType: 'checkout', entityId: 'pagamento', metadata: { step: 3 } });
  }, [state.address.postalCode, state.shipping, router, tracker]);

  if (!state.address.postalCode || !state.shipping) return null;

  const baseFreeShipping = subtotalCents >= FREE_SHIPPING_ABOVE;
  const couponFreeShipping = state.coupon?.freeShipping ?? false;
  const freeShipping = baseFreeShipping || couponFreeShipping;
  const shippingCents = freeShipping ? 0 : (state.shipping?.priceCents ?? 0);
  const couponDiscountCents = state.coupon?.discountCents ?? 0;
  const totalCents = Math.max(0, subtotalCents - couponDiscountCents + shippingCents);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Informe um código');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}&subtotalCents=${subtotalCents}`);
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCoupon(null);
        setCouponError(couponReasonPT(data.reason, data.minOrderCents));
        return;
      }
      setCoupon({
        code: data.code ?? code,
        type: data.type,
        value: data.value,
        discountCents: data.discountCents ?? 0,
        freeShipping: data.freeShipping ?? false,
      });
      setCouponInput(data.code ?? code);
    } catch {
      setCouponError('Erro ao validar cupom');
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput('');
    setCouponError('');
  }

  const pixPct = getPixDiscountPct();
  const pixTotalCents = applyPixDiscount(totalCents);
  const pixSavingsCents = pixDiscountAmountCents(totalCents);

  type PaymentMethodCard = {
    id: 'pix' | 'credit_card' | 'boleto';
    label: string;
    icon: string;
    desc: string;
    badge: string | null;
  };

  const METHODS: PaymentMethodCard[] = [
    {
      id: 'pix' as const,
      label: 'Pix',
      icon: '◉',
      desc: 'Pagamento instantâneo. QR code gerado após confirmar.',
      badge: `${pixPct}% de desconto`,
    },
    {
      id: 'credit_card' as const,
      label: 'Cartão de crédito',
      icon: '◈',
      desc: 'Em até 6× sem juros. Dados tokenizados via Mercado Pago.',
      badge: null,
    },
    {
      id: 'boleto' as const,
      label: 'Boleto bancário',
      icon: '▣',
      desc: 'Vence em 3 dias úteis. Confirmação em até 2 dias úteis.',
      badge: null,
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPaymentMethod(method);
    setGift(isGift, giftMessage);

    try {
      const utmRaw = sessionStorage.getItem('lojeo_utm');
      const utm = utmRaw ? JSON.parse(utmRaw) as { source?: string; medium?: string; campaign?: string } : null;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            variantId: i.variantId,
            productName: i.name,
            variantName: Object.values(i.options ?? {}).join(' / ') || null,
            sku: null,
            imageUrl: i.imageUrl,
            options: i.options ?? {},
            unitPriceCents: i.priceCents,
            qty: i.qty,
          })),
          customerEmail: state.customerEmail || null,
          shippingAddress: state.address,
          shipping: state.shipping,
          paymentMethod: method,
          couponCode: state.coupon?.code ?? undefined,
          utm,
          gift: isGift ? { isGift: true, message: giftMessage || null } : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar pedido');

      setOrder(data.orderId, data.orderNumber);
      setStep('confirmacao');

      // Pixel event: Purchase (BEFORE clear() — items ainda no carrinho para metadata)
      const totalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
      trackPixelEvent('Purchase', {
        value: totalCents,
        currency: 'BRL',
        order_id: data.orderId,
        content_ids: items.map(i => i.productId),
        content_type: 'product',
        contents: items.map(i => ({ id: i.productId, quantity: i.qty, item_price: i.priceCents })),
        num_items: items.reduce((s, i) => s + i.qty, 0),
      });

      clear();
      tracker?.track({ type: 'checkout_step_complete', entityType: 'checkout', entityId: 'pagamento', metadata: { step: 3, method } });
      router.push('/checkout/confirmacao');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 64, alignItems: 'start' }}>
      <form onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: 32, fontSize: 22 }}>Forma de pagamento</h2>

        {/* Gift option */}
        <div style={{ marginBottom: 32, padding: '16px 20px', border: '1px solid var(--divider)', borderRadius: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isGift}
              onChange={e => setIsGift(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
            />
            <div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>É um presente 🎁</span>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Incluímos cartão personalizado e embalagem especial</p>
            </div>
          </label>
          {isGift && (
            <textarea
              placeholder="Mensagem para o cartão (opcional)"
              value={giftMessage}
              onChange={e => setGiftMessage(e.target.value)}
              maxLength={280}
              rows={3}
              style={{
                marginTop: 12, width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', fontSize: 13, borderRadius: 4,
                border: '1px solid var(--divider)', background: 'var(--surface)',
                color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                resize: 'vertical',
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {METHODS.map(m => {
            const isPix = m.id === 'pix';
            const selected = method === m.id;
            // Pix recebe destaque visual: borda accent verde, pill "+N% OFF" grande,
            // preço com desconto vs sem (riscado), e linha de status do pagamento.
            const borderColor = isPix
              ? (selected ? '#1E6B22' : '#7BA66E')
              : (selected ? 'var(--text-primary)' : 'var(--divider)');
            const background = isPix
              ? (selected ? '#EAF4E5' : '#F4FAEF')
              : (selected ? 'var(--surface-sunken)' : 'var(--surface)');
            return (
              <label
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: '16px 20px', borderRadius: 8, cursor: 'pointer',
                  border: `${isPix ? 2 : 1.5}px solid ${borderColor}`,
                  background,
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  value={m.id}
                  checked={selected}
                  onChange={() => setMethod(m.id)}
                  style={{ accentColor: isPix ? '#1E6B22' : 'var(--accent)', marginTop: 2, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, color: isPix ? '#1E6B22' : 'var(--accent)' }}>{m.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{m.label}</span>
                    {isPix ? (
                      <span style={{
                        fontSize: 13, padding: '4px 12px', borderRadius: 999,
                        background: '#1E6B22', color: '#fff', fontWeight: 700,
                        letterSpacing: '0.02em',
                      }}>
                        +{pixPct}% OFF
                      </span>
                    ) : m.badge ? (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 99,
                        background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600,
                      }}>
                        {m.badge}
                      </span>
                    ) : null}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{m.desc}</p>
                  {isPix && totalCents > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {fmt(totalCents)}
                        </span>
                        <span style={{ fontSize: 22, fontWeight: 700, color: '#1E6B22', fontFamily: 'var(--font-display)' }}>
                          {fmt(pixTotalCents)}
                        </span>
                        <span style={{ fontSize: 12, color: '#1E6B22', fontWeight: 600 }}>
                          economia de {fmt(pixSavingsCents)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#1E6B22' }}>
                        Pague em até 1 dia útil · pague apenas {fmt(pixTotalCents)}
                      </p>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {/* Coupon input */}
        <div style={{ marginBottom: 24, padding: '16px 20px', border: '1px solid var(--divider)', borderRadius: 8 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
            Código de desconto
          </label>
          {state.coupon ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 99,
                  background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600,
                  letterSpacing: '0.5px',
                }}>
                  {state.coupon.code}
                </span>
                <span style={{ fontSize: 13, color: '#1E6B22' }}>
                  {state.coupon.freeShipping
                    ? 'Frete grátis aplicado'
                    : `Desconto de ${fmt(state.coupon.discountCents)} aplicado`}
                </span>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                style={{
                  fontSize: 12, color: 'var(--text-muted)', background: 'transparent',
                  border: 'none', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Remover
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={couponInput}
                onChange={e => { setCouponInput(e.target.value); setCouponError(''); }}
                placeholder="Ex.: BEMVINDO10"
                aria-label="Código de desconto"
                style={{
                  flex: 1, padding: '10px 12px', fontSize: 13, borderRadius: 4,
                  border: '1px solid var(--divider)', background: 'var(--surface)',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponLoading}
                style={{
                  padding: '10px 18px', fontSize: 13, fontWeight: 500,
                  borderRadius: 4, border: '1px solid var(--text-primary)',
                  background: couponLoading ? 'var(--divider)' : 'var(--surface)',
                  color: 'var(--text-primary)', cursor: couponLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {couponLoading ? 'Validando…' : 'Aplicar'}
              </button>
            </div>
          )}
          {couponError && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#E53E3E' }}>{couponError}</p>
          )}
        </div>

        {/* Pix discount info — confirmação compacta após o card destacado */}
        {method === 'pix' && (
          <div style={{
            padding: '12px 16px', background: '#EAF4E5',
            borderRadius: 4, marginBottom: 24, fontSize: 13, color: '#1E6B22',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <Icon name="info" size={14} style={{ flexShrink: 0 }} />
            Desconto de {pixPct}% aplicado · total {fmt(pixTotalCents)}
          </div>
        )}

        {/* Trust */}
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={13} style={{ color: 'var(--accent)' }} />
            Ambiente seguro SSL
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={13} style={{ color: 'var(--accent)' }} />
            Dados processados por Mercado Pago
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', background: '#FEF2F2', borderRadius: 4,
            marginBottom: 16, fontSize: 13, color: '#E53E3E',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push('/checkout/frete')}
            style={{
              padding: '14px 24px', fontSize: 14, borderRadius: 8, cursor: 'pointer',
              background: 'transparent', color: 'var(--text-secondary)',
              border: '1px solid var(--divider)',
            }}
          >
            ← Voltar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1, padding: '14px 24px', fontSize: 14, fontWeight: 500,
              background: loading ? 'var(--divider)' : 'var(--text-primary)',
              color: loading ? 'var(--text-muted)' : 'var(--text-on-dark)',
              border: 'none', borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Processando…' : `Confirmar pedido · ${fmt(method === 'pix' ? pixTotalCents : totalCents)}`}
          </button>
        </div>
      </form>

      <CheckoutSummary
        subtotalCents={subtotalCents}
        shippingCents={shippingCents}
        discountCents={couponDiscountCents}
        freeShipping={freeShipping}
      />
    </div>
  );
}
