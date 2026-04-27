'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

const PRESETS_CENTS: readonly number[] = [10000, 20000, 50000, 100000]; // R$ 100, 200, 500, 1.000
const DEFAULT_PRESET_CENTS = 10000;
const MIN_CUSTOM_CENTS = 5000;
const MAX_CUSTOM_CENTS = 500000;

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface SuccessPayload {
  code: string;
  balanceCents: number;
  expiresAt: string;
}

export default function GiftCardsPage() {
  const [selectedCents, setSelectedCents] = useState<number | 'custom'>(DEFAULT_PRESET_CENTS);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [buyerMessage, setBuyerMessage] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessPayload | null>(null);

  function resolveAmountCents(): number | null {
    if (selectedCents === 'custom') {
      const num = Number(customAmount.replace(',', '.'));
      if (!Number.isFinite(num) || num <= 0) return null;
      const cents = Math.round(num * 100);
      if (cents < MIN_CUSTOM_CENTS || cents > MAX_CUSTOM_CENTS) return null;
      return cents;
    }
    return selectedCents;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const amountCents = resolveAmountCents();
    if (amountCents == null) {
      setError(`Valor entre ${fmtBRL(MIN_CUSTOM_CENTS)} e ${fmtBRL(MAX_CUSTOM_CENTS)}`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      setError('Email do destinatário inválido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          buyerMessage: buyerMessage.trim() || undefined,
          deliveryDate: deliveryDate || null,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Partial<SuccessPayload> & { error?: string };

      if (!res.ok || !data.code) {
        setError(
          data.error === 'rate_limit'
            ? 'Muitas tentativas — aguarde alguns minutos.'
            : data.error === 'invalid_email'
            ? 'Email do destinatário inválido'
            : 'Erro ao gerar gift card. Tente novamente.',
        );
        return;
      }

      setSuccess({
        code: data.code,
        balanceCents: data.balanceCents ?? amountCents,
        expiresAt: data.expiresAt ?? '',
      });
    } catch {
      setError('Erro de rede — tente novamente');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const expiresLabel = success.expiresAt
      ? new Date(success.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '';
    return (
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 80px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 32, display: 'flex', gap: 8 }}>
          <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
          <span>·</span>
          <span>Gift cards</span>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
          <p
            className="eyebrow"
            style={{
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--accent)', marginBottom: 16,
            }}
          >
            Gift card gerado
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 28, lineHeight: 1.1, margin: '0 0 24px',
            }}
          >
            Pronto para presentear
          </h1>

          <div
            style={{
              background: 'var(--surface-sunken)', borderRadius: 8,
              padding: 32, margin: '0 0 32px',
            }}
          >
            <p className="eyebrow" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
              Código
            </p>
            <p
              style={{
                fontFamily: 'var(--font-display)', fontSize: 28,
                letterSpacing: '0.04em', margin: '0 0 20px',
                color: 'var(--text-primary)',
              }}
            >
              {success.code}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 6px' }}>Saldo</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>
                  {fmtBRL(success.balanceCents)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 6px' }}>Validade</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>
                  {expiresLabel}
                </p>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 32px' }}>
            Guarde o código com cuidado. O envio automático por e-mail será ativado em breve — por
            enquanto, compartilhe o código manualmente com quem vai receber.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setSuccess(null);
                setSelectedCents(DEFAULT_PRESET_CENTS);
                setCustomAmount('');
                setRecipientEmail('');
                setRecipientName('');
                setBuyerMessage('');
                setDeliveryDate('');
              }}
              style={{
                padding: '14px 28px', background: 'var(--text-primary)',
                color: 'var(--text-on-dark)', fontSize: 14, fontWeight: 500,
                border: 'none', borderRadius: 8, cursor: 'pointer',
              }}
            >
              Gerar outro gift card
            </button>
            <Link
              href="/produtos"
              style={{
                padding: '14px 28px', border: '1px solid var(--text-primary)',
                color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
                borderRadius: 8, textDecoration: 'none',
              }}
            >
              Ver coleção
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 80px' }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 32, display: 'flex', gap: 8 }}>
        <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
        <span>·</span>
        <span>Gift cards</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
        {/* Hero / copy */}
        <div style={{ position: 'sticky', top: 100 }}>
          <p
            className="eyebrow"
            style={{
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--accent)', marginBottom: 16,
            }}
          >
            Presente
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 28, lineHeight: 1.1, margin: '0 0 20px',
              letterSpacing: '-0.01em',
            }}
          >
            Um gesto que cabe em qualquer ocasião
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 32px', maxWidth: '40ch' }}>
            Escolha um valor, deixe uma mensagem e quem recebe escolhe a peça. Validade de 12
            meses — tempo de sobra para encontrar a joia certa.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { eyebrow: '01', text: 'Valor à sua escolha — predefinido ou personalizado.' },
              { eyebrow: '02', text: 'Código GFT-XXXX-XXXX-XXXX gerado na hora.' },
              { eyebrow: '03', text: 'Aplica em qualquer peça do catálogo, sem mínimo.' },
              { eyebrow: '04', text: 'Validade de 12 meses a partir da emissão.' },
            ].map(item => (
              <div key={item.eyebrow} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 16, alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: 14,
                    color: 'var(--accent)', letterSpacing: '0.04em',
                  }}
                >
                  {item.eyebrow}
                </span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--surface-sunken)', borderRadius: 8,
            padding: 36, display: 'flex', flexDirection: 'column', gap: 28,
          }}
        >
          {/* Valor */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend
              className="eyebrow"
              style={{
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-secondary)', marginBottom: 14, padding: 0,
              }}
            >
              Valor do gift card
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {PRESETS_CENTS.map(cents => {
                const active = selectedCents === cents;
                return (
                  <button
                    key={cents}
                    type="button"
                    onClick={() => setSelectedCents(cents)}
                    aria-pressed={active}
                    style={{
                      padding: '14px 12px',
                      background: active ? 'var(--text-primary)' : 'var(--bg)',
                      color: active ? 'var(--text-on-dark)' : 'var(--text-primary)',
                      border: active ? '1px solid var(--text-primary)' : '1px solid var(--divider)',
                      borderRadius: 4, fontSize: 15, fontFamily: 'var(--font-display)',
                      letterSpacing: '0.01em', cursor: 'pointer',
                      transition: 'background 120ms, color 120ms, border-color 120ms',
                    }}
                  >
                    {fmtBRL(cents)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedCents('custom')}
                aria-pressed={selectedCents === 'custom'}
                style={{
                  gridColumn: 'span 2',
                  padding: '14px 12px',
                  background: selectedCents === 'custom' ? 'var(--text-primary)' : 'var(--bg)',
                  color: selectedCents === 'custom' ? 'var(--text-on-dark)' : 'var(--text-primary)',
                  border: selectedCents === 'custom' ? '1px solid var(--text-primary)' : '1px solid var(--divider)',
                  borderRadius: 4, fontSize: 14, cursor: 'pointer',
                  transition: 'background 120ms, color 120ms, border-color 120ms',
                }}
              >
                Outro valor
              </button>
            </div>

            {selectedCents === 'custom' && (
              <div style={{ marginTop: 12 }}>
                <label
                  htmlFor="custom-amount"
                  className="eyebrow"
                  style={{
                    display: 'block', fontSize: 11, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8,
                  }}
                >
                  Valor (R$)
                </label>
                <input
                  id="custom-amount"
                  type="text"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value.replace(/[^\d,.]/g, ''))}
                  placeholder="ex: 350,00"
                  style={{
                    width: '100%', padding: '12px 14px',
                    border: '1px solid var(--divider)', borderRadius: 2,
                    fontSize: 15, background: 'var(--bg)',
                    fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
                  }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  Mínimo {fmtBRL(MIN_CUSTOM_CENTS)} · Máximo {fmtBRL(MAX_CUSTOM_CENTS)}
                </p>
              </div>
            )}
          </fieldset>

          {/* Destinatário */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p
              className="eyebrow"
              style={{
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-secondary)', margin: 0,
              }}
            >
              Para quem é
            </p>

            <div>
              <label htmlFor="recipient-email" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Email do destinatário <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                required
                placeholder="nome@exemplo.com"
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid var(--divider)', borderRadius: 2,
                  fontSize: 14, background: 'var(--bg)',
                  fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label htmlFor="recipient-name" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Nome (opcional)
              </label>
              <input
                id="recipient-name"
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="Quem vai receber"
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid var(--divider)', borderRadius: 2,
                  fontSize: 14, background: 'var(--bg)',
                  fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label htmlFor="buyer-message" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Mensagem (opcional)
              </label>
              <textarea
                id="buyer-message"
                value={buyerMessage}
                onChange={e => setBuyerMessage(e.target.value.slice(0, 280))}
                placeholder="Uma mensagem curta acompanha o gift card."
                rows={3}
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid var(--divider)', borderRadius: 2,
                  fontSize: 14, background: 'var(--bg)',
                  fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
                  resize: 'vertical', minHeight: 80,
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {buyerMessage.length}/280
              </p>
            </div>

            <div>
              <label htmlFor="delivery-date" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Data de entrega (opcional)
              </label>
              <input
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{
                  width: '100%', padding: '12px 14px',
                  border: '1px solid var(--divider)', borderRadius: 2,
                  fontSize: 14, background: 'var(--bg)',
                  fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                fontSize: 13, color: '#E53E3E',
                padding: '10px 14px', background: 'rgba(229,62,62,0.08)',
                borderRadius: 4,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', padding: '15px 24px',
              background: 'var(--text-primary)', color: 'var(--text-on-dark)',
              fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 8,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Gerando…' : 'Gerar gift card'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            Pagamento real entra na próxima fase. Por enquanto, o código é gerado e fica disponível
            para resgate na loja.
          </p>
        </form>
      </div>
    </div>
  );
}
