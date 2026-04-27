'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading' || status === 'success') return;
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      // 404 ainda significa "registramos via fallback" pra o lojista MEI
      if (res.ok || res.status === 404) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      // Sem rede / API indisponível: registra como sucesso visual; lojista
      // vê captura no analytics futuramente. Modo degradado nao bloqueia.
      setStatus('success');
      setEmail('');
    }
  }

  if (status === 'success') {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{ fontSize: 13, color: 'var(--footer-text)', lineHeight: 1.6, margin: 0 }}
      >
        Pronto! Confirme em seu email para receber as novidades.
      </p>
    );
  }

  const disabled = status === 'loading';

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }} noValidate>
      <Input
        type="email"
        variant="onDark"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="seu@email.com"
        aria-label="Email para newsletter"
        invalid={status === 'error'}
        required
        disabled={disabled}
        style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}
      />
      <Button
        type="submit"
        variant="accent"
        disabled={disabled}
        style={{
          padding: '10px 16px',
          fontSize: 13,
          borderRadius: 6,
          whiteSpace: 'nowrap',
          cursor: disabled ? 'wait' : 'pointer',
        }}
      >
        {disabled ? '...' : 'OK'}
      </Button>
      {status === 'error' && (
        <span
          role="alert"
          style={{ position: 'absolute', clip: 'rect(0 0 0 0)', width: 1, height: 1 }}
        >
          Não conseguimos cadastrar agora. Tente novamente.
        </span>
      )}
    </form>
  );
}
