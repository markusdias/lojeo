'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckout, type ShippingOption } from '../../../components/checkout/checkout-provider';
import { useCart } from '../../../components/cart/cart-provider';
import { useTracker } from '../../../components/tracker-provider';
import { CheckoutSummary } from '../../../components/checkout/checkout-summary';
import { estimateIntlTax, intlTaxNoticeCopy } from '../../../lib/shipping/intl-tax';

function fmt(cents: number, currency = 'BRL') {
  if (cents === 0) return currency === 'BRL' ? 'Grátis' : 'Free';
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  return (cents / 100).toLocaleString(locale, { style: 'currency', currency });
}

export default function FretePage() {
  const router = useRouter();
  const { state, setShipping, setStep } = useCheckout();
  const { subtotalCents } = useCart();
  const tracker = useTracker();
  const [selectedId, setSelectedId] = useState(state.shipping?.id ?? '');
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [currency, setCurrency] = useState<string>('BRL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.address.postalCode) {
      router.push('/checkout/endereco');
      return;
    }
    tracker?.track({ type: 'checkout_step_start', entityType: 'checkout', entityId: 'frete', metadata: { step: 2 } });
  }, [state.address.postalCode, router, tracker]);

  useEffect(() => {
    if (!state.address.postalCode) return;
    setLoading(true);
    fetch('/api/shipping/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        country: state.address.country ?? 'BR',
        postalCode: state.address.postalCode,
        subtotalCents,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { options?: ShippingOption[]; currency?: string } | null) => {
        if (d?.options) {
          setOptions(d.options);
          setCurrency(d.currency ?? 'BRL');
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [state.address.postalCode, state.address.country, subtotalCents]);

  const selected = options.find((o) => o.id === selectedId);

  // Aviso VAT/alfândega — exibido quando toCountry != fromCountry default
  const toCountry = (state.address.country ?? 'BR').toUpperCase();
  const fromCountry = currency === 'BRL' ? 'BR' : currency === 'GBP' ? 'GB' : currency === 'EUR' ? 'DE' : 'US';
  const taxEstimate = selected
    ? estimateIntlTax({
        toCountry,
        fromCountry,
        subtotalCents,
        shippingCents: selected.priceCents,
        locale: currency === 'BRL' ? 'pt-BR' : 'en-US',
      })
    : null;
  const taxCopy = taxEstimate ? intlTaxNoticeCopy(taxEstimate) : null;
  const showTaxNotice = taxEstimate && taxEstimate.noticeKey !== 'none' && taxCopy && taxCopy.title;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setShipping(selected);
    setStep('pagamento');
    tracker?.track({ type: 'checkout_step_complete', entityType: 'checkout', entityId: 'frete', metadata: { step: 2 } });
    router.push('/checkout/pagamento');
  }

  if (!state.address.postalCode) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 64, alignItems: 'start' }}>
      <form onSubmit={handleSubmit}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.1,
          margin: '0 0 6px', fontWeight: 400,
        }}>
          Como prefere receber?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 28 }}>
          Entregando em: {state.address.street}, {state.address.number} — {state.address.city}/{state.address.state}, {state.address.postalCode}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 4px' }}>
              Calculando frete…
            </p>
          )}
          {!loading && options.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 4px' }}>
              Nenhuma opção de frete disponível para este destino.
            </p>
          )}
          {options.map(opt => (
            <label
              key={opt.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px', borderRadius: 8, cursor: 'pointer',
                border: `1.5px solid ${selectedId === opt.id ? 'var(--text-primary)' : 'var(--divider)'}`,
                background: selectedId === opt.id ? 'var(--surface-sunken)' : 'var(--surface)',
              }}
            >
              <input
                type="radio"
                name="shipping"
                value={opt.id}
                checked={selectedId === opt.id}
                onChange={() => setSelectedId(opt.id)}
                style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{opt.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {opt.carrier} · {opt.service}
                </p>
              </div>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400,
                color: opt.priceCents === 0 ? 'var(--success)' : 'var(--text-primary)',
              }}>
                {fmt(opt.priceCents, currency)}
              </span>
            </label>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
          * Prazos em dias úteis a partir do despacho. Sprint 4: cálculo real via Melhor Envio por CEP.
        </p>

        {showTaxNotice && taxCopy && taxEstimate && (
          <div
            data-testid="intl-tax-notice"
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 8,
              background: 'var(--surface-sunken, #FAF6EE)',
              border: '1px solid var(--divider)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              {taxCopy.title}
              {taxEstimate.estimatedCents > 0 && (
                <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-secondary)' }}>
                  ≈ {fmt(taxEstimate.estimatedCents, currency)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {taxCopy.body}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            type="button"
            onClick={() => router.push('/checkout/endereco')}
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
            disabled={!selectedId}
            style={{
              flex: 1, padding: '14px 24px', fontSize: 14, fontWeight: 500,
              background: selectedId ? 'var(--text-primary)' : 'var(--divider)',
              color: selectedId ? 'var(--text-on-dark)' : 'var(--text-muted)',
              border: 'none', borderRadius: 8,
              cursor: selectedId ? 'pointer' : 'not-allowed',
            }}
          >
            Continuar para pagamento →
          </button>
        </div>
      </form>

      <CheckoutSummary subtotalCents={subtotalCents} shippingCents={selected?.priceCents} />
    </div>
  );
}
