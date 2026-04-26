'use client';

import { useState, useEffect } from 'react';
import { setConsent, getConsent } from '@lojeo/tracking';

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    // Banner shown if user hasn't explicitly set analytics preference
    const raw = localStorage.getItem('lojeo_consent');
    if (!raw) setVisible(true);
    else if (consent.analytics === false && !raw.includes('"analytics"')) setVisible(true);
  }, []);

  if (!visible) return null;

  function accept() {
    setConsent({ analytics: true, marketing: false });
    setVisible(false);
  }

  function decline() {
    setConsent({ analytics: false, marketing: false });
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--color-bg-elevated, #1a1a1a)',
        borderTop: '1px solid var(--color-border, #333)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        zIndex: 9999,
        fontSize: '0.875rem',
      }}
    >
      <p style={{ margin: 0, maxWidth: '60ch', color: 'var(--color-fg-muted, #aaa)' }}>
        Usamos cookies essenciais para o funcionamento da loja e, com seu consentimento, cookies
        analíticos para melhorar sua experiência. Consulte nossa{' '}
        <a href="/privacidade" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Política de Privacidade
        </a>
        .
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            padding: '0.4rem 0.9rem',
            border: '1px solid var(--color-border, #333)',
            background: 'transparent',
            color: 'var(--color-fg-muted, #aaa)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            borderRadius: '2px',
          }}
        >
          Só essenciais
        </button>
        <button
          onClick={accept}
          style={{
            padding: '0.4rem 0.9rem',
            border: 'none',
            background: 'var(--color-fg, #f0f0f0)',
            color: 'var(--color-bg, #0a0a0a)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            borderRadius: '2px',
          }}
        >
          Aceitar tudo
        </button>
      </div>
    </div>
  );
}
