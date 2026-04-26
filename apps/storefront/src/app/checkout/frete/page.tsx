'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckout, type ShippingOption } from '../../../components/checkout/checkout-provider';
import { useCart } from '../../../components/cart/cart-provider';
import { useTracker } from '../../../components/tracker-provider';
import { CheckoutSummary } from '../../../components/checkout/checkout-summary';

// Sprint 4: Melhor Envio OAuth + cálculo real de frete por CEP
// Por agora: opções simuladas baseadas no subtotal
function getShippingOptions(subtotalCents: number, postalCode: string): ShippingOption[] {
  const state = postalCode.slice(0, 5);
  const isSP = state >= '01000' && state <= '19999';
  const base = isSP ? 1200 : 2400;

  return [
    {
      id: 'correios-pac',
      carrier: 'Correios',
      service: 'PAC',
      deadlineDays: isSP ? 5 : 10,
      priceCents: subtotalCents >= 50000 ? 0 : base,
      label: `Correios PAC — até ${isSP ? 5 : 10} dias úteis`,
    },
    {
      id: 'correios-sedex',
      carrier: 'Correios',
      service: 'SEDEX',
      deadlineDays: isSP ? 2 : 4,
      priceCents: subtotalCents >= 50000 ? 0 : Math.round(base * 2.2),
      label: `Correios SEDEX — até ${isSP ? 2 : 4} dias úteis`,
    },
    {
      id: 'jadlog-package',
      carrier: 'Jadlog',
      service: 'Package',
      deadlineDays: isSP ? 3 : 7,
      priceCents: subtotalCents >= 50000 ? 0 : Math.round(base * 1.5),
      label: `Jadlog Package — até ${isSP ? 3 : 7} dias úteis`,
    },
  ];
}

function fmt(cents: number) {
  if (cents === 0) return 'Grátis';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FretePage() {
  const router = useRouter();
  const { state, setShipping, setStep } = useCheckout();
  const { subtotalCents } = useCart();
  const tracker = useTracker();
  const [selectedId, setSelectedId] = useState(state.shipping?.id ?? '');

  useEffect(() => {
    if (!state.address.postalCode) {
      router.push('/checkout/endereco');
      return;
    }
    tracker?.track({ type: 'checkout_step_start', entityType: 'checkout', entityId: 'frete', metadata: { step: 2 } });
  }, [state.address.postalCode, router, tracker]);

  const options = getShippingOptions(subtotalCents, state.address.postalCode ?? '');
  const selected = options.find(o => o.id === selectedId);

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
        <h2 style={{ marginBottom: 8, fontSize: 22 }}>Opções de frete</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
          Entregando em: {state.address.street}, {state.address.number} — {state.address.city}/{state.address.state}, {state.address.postalCode}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                fontSize: 14, fontWeight: 600,
                color: opt.priceCents === 0 ? '#1E6B22' : 'var(--text-primary)',
              }}>
                {fmt(opt.priceCents)}
              </span>
            </label>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
          * Prazos em dias úteis a partir do despacho. Sprint 4: cálculo real via Melhor Envio por CEP.
        </p>

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
