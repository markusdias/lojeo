'use client';

import { useState } from 'react';

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copiar código do vale-presente"
      style={{
        padding: '10px 20px',
        background: copied ? 'var(--accent, #C9A85C)' : 'var(--bg, #fff)',
        color: copied ? 'var(--paper, #fff)' : 'var(--text-primary, #14110F)',
        border: `1px solid ${copied ? 'var(--accent, #C9A85C)' : 'var(--border, rgba(0,0,0,0.12))'}`,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        transition: 'all 160ms ease',
      }}
    >
      {copied ? 'Código copiado ✓' : 'Copiar código'}
    </button>
  );
}
