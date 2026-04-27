'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  onlyUnread: boolean;
  unreadCount: number;
}

export function NotificacoesActions({ unreadCount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markAll() {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        onClick={markAll}
        disabled={busy || unreadCount === 0}
        style={{
          padding: '8px 14px',
          fontSize: 13,
          background: unreadCount > 0 ? 'var(--fg)' : 'transparent',
          color: unreadCount > 0 ? '#fff' : 'var(--fg-muted)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          cursor: unreadCount > 0 ? 'pointer' : 'not-allowed',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Marcando…' : 'Marcar todas como lidas'}
      </button>
    </div>
  );
}
