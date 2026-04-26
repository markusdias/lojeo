'use client';

export function NewsletterForm() {
  return (
    <form
      action="/api/newsletter"
      method="POST"
      style={{ display: 'flex', gap: 8 }}
      onSubmit={e => e.preventDefault()}
    >
      <input
        type="email"
        placeholder="seu@email.com"
        aria-label="Email para newsletter"
        required
        style={{
          flex: 1, padding: '10px 12px', fontSize: 13,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 6, color: 'var(--footer-text)',
          outline: 'none',
        }}
      />
      <button type="submit" style={{
        padding: '10px 16px', fontSize: 13, fontWeight: 500,
        background: 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}>
        OK
      </button>
    </form>
  );
}
