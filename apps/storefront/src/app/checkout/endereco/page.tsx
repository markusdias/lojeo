'use client';

import { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckout, type CheckoutAddress } from '../../../components/checkout/checkout-provider';
import { useCart } from '../../../components/cart/cart-provider';
import { useTracker } from '../../../components/tracker-provider';
import { CheckoutSummary } from '../../../components/checkout/checkout-summary';
import { trackPixelEvent } from '../../../components/marketing/pixel-events';

const STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

function Field({ label, error, children, htmlFor }: { label: string; error?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#E53E3E' }} role="alert">{error}</span>}
    </div>
  );
}

function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      style={{
        padding: '10px 12px', fontSize: 14,
        border: '1px solid var(--divider)', borderRadius: 4,
        background: 'var(--surface)', color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box' as const,
        ...style,
      }}
      {...props}
    />
  );
}

export default function EnderecoPage() {
  const router = useRouter();
  const { state, setAddress, setCustomerEmail, setStep } = useCheckout();
  const { items, subtotalCents } = useCart();
  const tracker = useTracker();

  const [form, setForm] = useState<Partial<CheckoutAddress>>({
    recipientName: '',
    phone: '',
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    ...state.address,
  });
  const [email, setEmail] = useState(state.customerEmail ?? '');
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutAddress | 'email', string>>>({});
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const ids = {
    email: useId(),
    name: useId(),
    phone: useId(),
    cep: useId(),
    street: useId(),
    number: useId(),
    complement: useId(),
    neighborhood: useId(),
    city: useId(),
    state: useId(),
  };

  useEffect(() => {
    tracker?.track({ type: 'checkout_step_start', entityType: 'checkout', entityId: 'endereco', metadata: { step: 1 } });
    // Pixel event: InitiateCheckout — disparado uma vez ao entrar no fluxo
    const totalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
    trackPixelEvent('InitiateCheckout', {
      value: totalCents,
      currency: 'BRL',
      content_ids: items.map(i => i.productId),
      content_type: 'product',
      contents: items.map(i => ({ id: i.productId, quantity: i.qty, item_price: i.priceCents })),
      num_items: items.reduce((s, i) => s + i.qty, 0),
    });
  }, [tracker]);

  // ViaCEP autocomplete
  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
        return;
      }
      setForm(prev => ({
        ...prev,
        street: data.logradouro ?? prev.street,
        neighborhood: data.bairro ?? prev.neighborhood,
        city: data.localidade ?? prev.city,
        state: data.uf ?? prev.state,
      }));
    } catch {
      setCepError('Erro ao buscar CEP. Preencha manualmente.');
    } finally {
      setCepLoading(false);
    }
  }

  function formatCep(v: string) {
    return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
  }

  function formatPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.recipientName?.trim()) e.recipientName = 'Obrigatório';
    if (!form.phone?.replace(/\D/g, '') || form.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido';
    if (!form.postalCode?.replace(/\D/g, '') || form.postalCode.replace(/\D/g, '').length !== 8) e.postalCode = 'CEP inválido';
    if (!form.street?.trim()) e.street = 'Obrigatório';
    if (!form.number?.trim()) e.number = 'Obrigatório';
    if (!form.city?.trim()) e.city = 'Obrigatório';
    if (!form.state?.trim()) e.state = 'Obrigatório';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setAddress(form);
    setCustomerEmail(email);
    setStep('frete');
    tracker?.track({ type: 'checkout_step_complete', entityType: 'checkout', entityId: 'endereco', metadata: { step: 1 } });
    router.push('/checkout/frete');
  }

  if (items.length === 0) {
    router.push('/carrinho');
    return null;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 64, alignItems: 'start' }}>
      <form onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: 32, fontSize: 22 }}>Endereço de entrega</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Email" error={errors.email} htmlFor={ids.email}>
            <Input
              id={ids.email}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="para acompanhar seu pedido"
              autoComplete="email"
            />
          </Field>

          <Field label="Nome do destinatário" error={errors.recipientName} htmlFor={ids.name}>
            <Input
              id={ids.name}
              value={form.recipientName ?? ''}
              onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))}
              placeholder="Nome completo"
              autoComplete="name"
            />
          </Field>

          <Field label="Telefone (WhatsApp)" error={errors.phone} htmlFor={ids.phone}>
            <Input
              id={ids.phone}
              value={form.phone ?? ''}
              onChange={e => setForm(p => ({ ...p, phone: formatPhone(e.target.value) }))}
              placeholder="(11) 99999-0000"
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>

          <Field label={cepLoading ? 'CEP (buscando…)' : 'CEP'} error={errors.postalCode || cepError} htmlFor={ids.cep}>
            <Input
              id={ids.cep}
              value={form.postalCode ?? ''}
              onChange={e => {
                const v = formatCep(e.target.value);
                setForm(p => ({ ...p, postalCode: v }));
                if (v.replace(/\D/g, '').length === 8) lookupCep(v);
              }}
              placeholder="00000-000"
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <Field label="Rua / Logradouro" error={errors.street} htmlFor={ids.street}>
              <Input
                id={ids.street}
                value={form.street ?? ''}
                onChange={e => setForm(p => ({ ...p, street: e.target.value }))}
                placeholder="Rua, Avenida…"
                autoComplete="address-line1"
              />
            </Field>
            <Field label="Número" error={errors.number} htmlFor={ids.number}>
              <Input
                id={ids.number}
                value={form.number ?? ''}
                onChange={e => setForm(p => ({ ...p, number: e.target.value }))}
                placeholder="123"
                style={{ width: 80 }}
                autoComplete="address-line2"
              />
            </Field>
          </div>

          <Field label="Complemento (opcional)" htmlFor={ids.complement}>
            <Input
              id={ids.complement}
              value={form.complement ?? ''}
              onChange={e => setForm(p => ({ ...p, complement: e.target.value }))}
              placeholder="Apto, Bloco…"
            />
          </Field>

          <Field label="Bairro" htmlFor={ids.neighborhood}>
            <Input
              id={ids.neighborhood}
              value={form.neighborhood ?? ''}
              onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))}
              placeholder="Bairro"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <Field label="Cidade" error={errors.city} htmlFor={ids.city}>
              <Input
                id={ids.city}
                value={form.city ?? ''}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="Cidade"
                autoComplete="address-level2"
              />
            </Field>
            <Field label="Estado" error={errors.state} htmlFor={ids.state}>
              <select
                id={ids.state}
                value={form.state ?? ''}
                onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                style={{
                  padding: '10px 8px', fontSize: 14, width: 80,
                  border: '1px solid var(--divider)', borderRadius: 4,
                  background: 'var(--surface)', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <option value="">UF</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: 32, width: '100%', padding: '15px 24px',
            background: 'var(--text-primary)', color: 'var(--text-on-dark)',
            fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 8, cursor: 'pointer',
          }}
        >
          Continuar para o frete →
        </button>
      </form>

      <CheckoutSummary subtotalCents={subtotalCents} shippingCents={state.shipping?.priceCents} />
    </div>
  );
}
