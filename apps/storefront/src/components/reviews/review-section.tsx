'use client';

import { useState, useEffect } from 'react';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  anonymousName: string | null;
  verifiedPurchase: boolean;
  adminResponse: string | null;
  createdAt: string;
}

function Stars({ value, interactive = false, onChange }: { value: number; interactive?: boolean; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => interactive && onChange?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{
            background: 'none', border: 'none', padding: 2, cursor: interactive ? 'pointer' : 'default',
            fontSize: 18, color: i <= (hover || value) ? '#C9A85C' : '#D1D5DB',
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then(r => r.json())
      .then(data => { setReviews(data.reviews ?? []); setAvg(data.avg ?? 0); setTotal(data.total ?? 0); });
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, rating, title, body, name, email }),
    });
    setSubmitting(false);
    if (res.ok) { setSubmitted(true); setShowForm(false); }
  }

  return (
    <div style={{ paddingTop: 48, borderTop: '1px solid var(--divider)', marginTop: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 4 }}>Avaliações</h2>
          {total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Stars value={Math.round(avg)} />
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{avg.toFixed(1)} · {total} {total === 1 ? 'avaliação' : 'avaliações'}</span>
            </div>
          )}
        </div>
        {!submitted && (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 500,
              background: 'transparent', color: 'var(--text-primary)',
              border: '1px solid var(--text-primary)', borderRadius: 6, cursor: 'pointer',
            }}
          >
            {showForm ? 'Cancelar' : 'Escrever avaliação'}
          </button>
        )}
      </div>

      {submitted && (
        <div style={{ padding: '16px 20px', background: 'var(--accent-soft)', borderRadius: 8, marginBottom: 32, fontSize: 14, color: 'var(--accent)' }}>
          ✓ Obrigada! Sua avaliação foi enviada e será publicada após moderação.
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ padding: '24px', border: '1px solid var(--divider)', borderRadius: 8, marginBottom: 32 }}>
          <h3 style={{ marginBottom: 20 }}>Sua avaliação</h3>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Nota *</p>
            <Stars value={rating} interactive onChange={setRating} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Nome *</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Seu nome" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Email (não publicado)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Resumo da sua experiência" maxLength={200} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Avaliação</label>
            <textarea
              value={body} onChange={e => setBody(e.target.value)} rows={4} maxLength={2000}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)' }}
              placeholder="Conte sua experiência com o produto…"
            />
          </div>
          <button
            type="submit" disabled={submitting || rating === 0}
            style={{
              padding: '12px 28px', fontSize: 14, fontWeight: 500, borderRadius: 6, cursor: submitting || rating === 0 ? 'not-allowed' : 'pointer',
              background: submitting || rating === 0 ? 'var(--divider)' : 'var(--text-primary)',
              color: submitting || rating === 0 ? 'var(--text-muted)' : 'var(--text-on-dark)', border: 'none',
            }}
          >
            {submitting ? 'Enviando…' : 'Enviar avaliação'}
          </button>
        </form>
      )}

      {/* Reviews list */}
      {reviews.length === 0 && !showForm && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Seja o primeiro a avaliar este produto.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {reviews.map(r => (
          <div key={r.id} style={{ paddingBottom: 24, borderBottom: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Stars value={r.rating ?? 0} />
              {r.verifiedPurchase && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>
                  Compra verificada
                </span>
              )}
            </div>
            {r.title && <p style={{ fontWeight: 500, marginBottom: 4 }}>{r.title}</p>}
            {r.body && <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.body}</p>}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              {r.anonymousName} · {new Date(r.createdAt).toLocaleDateString('pt-BR')}
            </p>
            {r.adminResponse && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--surface-sunken)', borderRadius: 4, borderLeft: '3px solid var(--accent)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>Resposta da loja</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.adminResponse}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 4,
  border: '1px solid var(--divider)', background: 'var(--surface)', color: 'var(--text-primary)',
  boxSizing: 'border-box',
};
