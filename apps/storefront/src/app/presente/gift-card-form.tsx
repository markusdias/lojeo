'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';

const PRESETS = [5000, 10000, 20000, 50000];

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function GiftCardForm() {
  const router = useRouter();
  const valueId = useId();
  const customId = useId();
  const recipientEmailId = useId();
  const recipientNameId = useId();
  const senderNameId = useId();
  const messageId = useId();

  const [value, setValue] = useState<number>(10000);
  const [custom, setCustom] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickValue(v: number) {
    setValue(v);
    setCustom('');
  }

  function applyCustom() {
    const cents = Math.round(parseFloat(custom.replace(',', '.')) * 100);
    if (Number.isFinite(cents) && cents >= 5000 && cents <= 500000) {
      setValue(cents);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!recipientEmail.includes('@')) {
      setError('Email do destinatário é obrigatório.');
      return;
    }
    if (value < 5000 || value > 500000) {
      setError('Valor deve estar entre R$ 50 e R$ 5.000.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/gift-card/purchase', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          valueCents: value,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          senderName: senderName.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) {
        setError(data.error ?? 'Não foi possível gerar o vale. Tente novamente.');
        setBusy(false);
        return;
      }
      router.push(`/presente/sucesso/${data.code}`);
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: 'var(--bg, #fff)',
        border: '1px solid var(--border, rgba(0,0,0,0.1))',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend
          id={valueId}
          style={{
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--accent, #C9A85C)',
            marginBottom: 12,
          }}
        >
          Escolha o valor
        </legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }} role="radiogroup" aria-labelledby={valueId}>
          {PRESETS.map(v => {
            const selected = value === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => pickValue(v)}
                style={{
                  padding: '14px 12px',
                  border: `1px solid ${selected ? 'var(--accent, #C9A85C)' : 'var(--border, rgba(0,0,0,0.12))'}`,
                  background: selected ? 'var(--accent-soft, rgba(201,168,92,0.12))' : 'var(--bg, #fff)',
                  color: 'var(--text-primary, #14110F)',
                  borderRadius: 'var(--radius-md, 10px)',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: selected ? 600 : 500,
                  fontFamily: 'var(--font-display, serif)',
                  letterSpacing: '-0.01em',
                  transition: 'all 120ms ease',
                }}
              >
                {fmtBRL(v)}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label htmlFor={customId} style={{ fontSize: 13, color: 'var(--text-secondary, #3D352F)' }}>
            Outro valor:
          </label>
          <input
            id={customId}
            type="number"
            inputMode="numeric"
            min={50}
            max={5000}
            placeholder="ex: 250"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onBlur={applyCustom}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--border, rgba(0,0,0,0.12))',
              borderRadius: 8,
              fontSize: 14,
              color: 'var(--text-primary, #14110F)',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-muted, #6B6055)' }}>R$</span>
        </div>
      </fieldset>

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label
            htmlFor={recipientEmailId}
            style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary, #3D352F)', marginBottom: 6 }}
          >
            Email de quem vai receber *
          </label>
          <input
            id={recipientEmailId}
            type="email"
            required
            value={recipientEmail}
            onChange={e => setRecipientEmail(e.target.value)}
            placeholder="presenteado@email.com"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div>
            <label
              htmlFor={recipientNameId}
              style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary, #3D352F)', marginBottom: 6 }}
            >
              Nome (destinatário)
            </label>
            <input
              id={recipientNameId}
              type="text"
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              placeholder="Maria"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              htmlFor={senderNameId}
              style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary, #3D352F)', marginBottom: 6 }}
            >
              Seu nome
            </label>
            <input
              id={senderNameId}
              type="text"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              placeholder="João"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor={messageId}
            style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary, #3D352F)', marginBottom: 6 }}
          >
            Mensagem (opcional)
          </label>
          <textarea
            id={messageId}
            rows={3}
            maxLength={500}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Para você comemorar com algo eterno…"
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted, #6B6055)', textAlign: 'right' }}>
            {message.length}/500
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '10px 14px',
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: 8,
            fontSize: 13,
            color: '#991B1B',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        style={{
          padding: '14px 24px',
          background: 'var(--text-primary, #14110F)',
          color: 'var(--paper, #fff)',
          border: 'none',
          borderRadius: 'var(--radius-md, 10px)',
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: '0.02em',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
          transition: 'opacity 120ms ease',
        }}
      >
        {busy ? 'Gerando…' : `Comprar por ${fmtBRL(value)}`}
      </button>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted, #6B6055)', textAlign: 'center' }}>
        Confirmação de pagamento por email. Sem juros, sem taxa de envio.
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--border, rgba(0,0,0,0.12))',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--text-primary, #14110F)',
  background: 'var(--bg, #fff)',
  outline: 'none',
};
