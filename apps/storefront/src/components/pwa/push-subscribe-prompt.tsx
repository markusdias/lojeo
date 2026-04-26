'use client';

import { useEffect, useState } from 'react';

const PROMPT_DISMISSED_KEY = 'lojeo_push_dismissed';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSubscribePrompt() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setPermission(Notification.permission);
    const wasDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY) === '1';
    setDismissed(wasDismissed);
    fetch('/api/push-subscriptions')
      .then(async r => {
        if (r.ok) {
          const data = await r.json() as { publicKey: string };
          setVapidKey(data.publicKey);
        }
      })
      .catch(() => null);
  }, []);

  async function subscribe() {
    if (!vapidKey) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });
      await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      setPermission('granted');
    } catch (err) {
      console.warn('push subscribe failed:', err);
      setPermission(Notification.permission);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
    setDismissed(true);
  }

  if (permission === 'unsupported' || !vapidKey || dismissed || permission === 'granted' || permission === 'denied') {
    return null;
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--divider)',
      borderRadius: 8,
      padding: 16,
      fontSize: 13,
      color: 'var(--text-primary)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <span style={{ flex: 1 }}>
        🔔 Quer ser avisada quando seu pedido andar ou produtos da wishlist voltarem?
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={subscribe}
          disabled={busy}
          style={{
            background: 'var(--accent)',
            color: 'var(--text-on-dark)',
            border: 'none',
            borderRadius: 4,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 500,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Aguardando...' : 'Receber novidades'}
        </button>
        <button
          onClick={dismiss}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
