'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NpsInner() {
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? null;
  const trigger = (params.get('trigger') ?? 'manual') as 'delivery_d7' | 'ticket_close' | 'manual' | 'web_widget';
  const initialScore = (() => {
    const raw = params.get('score');
    if (raw === null) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 10) return null;
    return n;
  })();

  const [score, setScore] = useState<number | null>(initialScore);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialScore !== null) {
      setScore(initialScore);
    }
  }, [initialScore]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (score === null) {
      setError('Selecione uma nota de 0 a 10.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/nps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          score,
          comment: comment || null,
          customerEmail: email || null,
          surveyTrigger: trigger,
          relatedOrderId: orderId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', padding: '0 24px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: '#EEF2E8',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 24px',
            fontSize: 32,
            color: 'var(--success, #166534)',
          }}
        >
          ✓
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1.1, margin: '0 0 12px' }}>
          Obrigado!
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 32 }}>
          Sua resposta foi registrada. Sua opinião é fundamental pra continuarmos melhorando.
        </p>
        <Link
          href="/produtos"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'var(--accent)',
            color: 'var(--text-on-accent, #fff)',
            borderRadius: 'var(--r-button, 8px)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.1, margin: '0 0 8px' }}>
        Como foi sua experiência?
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.5 }}>
        Em uma escala de 0 a 10, qual a probabilidade de você nos recomendar a um amigo?
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              style={{
                flex: '1 1 36px',
                minWidth: 36,
                padding: '12px 0',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid',
                borderColor: score === n ? 'var(--text-primary)' : 'var(--divider)',
                background: score === n
                  ? n >= 9 ? '#1a8056' : n >= 7 ? '#d4a04c' : '#b94a4a'
                  : 'var(--surface)',
                color: score === n ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 24 }}>
          <span>Nada provável</span>
          <span>Muito provável</span>
        </div>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            O que motivou sua nota? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Conte rapidamente o que mais gostou ou o que poderia melhorar."
            style={{
              width: '100%',
              padding: 12,
              fontSize: 14,
              border: '1px solid var(--divider)',
              borderRadius: 6,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Email <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional, para retorno)</span>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={{
              width: '100%',
              padding: 12,
              fontSize: 14,
              border: '1px solid var(--divider)',
              borderRadius: 6,
            }}
          />
        </label>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--error, #B91C1C)', marginBottom: 12 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || score === null}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: score === null ? 'var(--divider)' : 'var(--accent)',
            color: score === null ? 'var(--text-muted)' : 'var(--text-on-accent, #fff)',
            border: 'none',
            borderRadius: 'var(--r-button, 8px)',
            fontSize: 14,
            fontWeight: 500,
            cursor: submitting || score === null ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Enviando...' : 'Enviar resposta'}
        </button>
      </form>
    </div>
  );
}

export default function NpsPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '80px 0' }}>Carregando…</div>}>
      <NpsInner />
    </Suspense>
  );
}
