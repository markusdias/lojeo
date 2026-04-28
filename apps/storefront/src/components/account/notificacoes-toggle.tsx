'use client';

import { useEffect, useState } from 'react';

type Status =
  | 'unsupported'
  | 'denied'
  | 'unconfigured'
  | 'idle'
  | 'subscribing'
  | 'subscribed'
  | 'unsubscribing'
  | 'error';

const PROMPT_DISMISSED_KEY = 'lojeo_push_dismissed';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface CardProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: 'info' | 'warn' | 'ok' | 'error';
}

function Card({ title, description, action, tone = 'info' }: CardProps) {
  const bg =
    tone === 'ok' ? 'var(--success-bg, #EEF2E8)' :
    tone === 'warn' ? 'var(--warning-bg, #FEF3C7)' :
    tone === 'error' ? 'var(--error-bg, #FEE2E2)' :
    'var(--surface, #fff)';
  const border =
    tone === 'ok' ? 'var(--success, #5C7A4A)' :
    tone === 'warn' ? 'var(--warning, #B8853A)' :
    tone === 'error' ? 'var(--error, #B23B3B)' :
    'var(--divider, #E5E7EB)';
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: 18,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 15, fontWeight: 500, margin: 0, color: 'var(--text-primary, #111)' }}>
          {title}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #4B5563)', margin: '4px 0 0' }}>
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function NotificacoesToggle() {
  const [status, setStatus] = useState<Status>('idle');
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    fetch('/api/push-subscriptions')
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as { publicKey: string };
          setVapidKey(data.publicKey);
        } else {
          setStatus('unconfigured');
        }
      })
      .catch(() => setStatus('unconfigured'));

    // Detecta subscription existente
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setStatus('subscribed');
      })
      .catch(() => null);
  }, []);

  async function subscribe() {
    if (!vapidKey) return;
    setErrorMsg(null);
    setStatus('subscribing');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'idle');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });
      const r = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      localStorage.removeItem(PROMPT_DISMISSED_KEY);
      setStatus('subscribed');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  async function unsubscribe() {
    setErrorMsg(null);
    setStatus('unsubscribing');
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push-subscriptions?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: 'DELETE',
        });
        await sub.unsubscribe();
      }
      setStatus('idle');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  if (status === 'unsupported') {
    return (
      <Card
        tone="warn"
        title="Notificações não suportadas neste navegador"
        description="Seu navegador não suporta Web Push. Tente Chrome, Firefox ou Edge atualizados."
      />
    );
  }
  if (status === 'denied') {
    return (
      <Card
        tone="error"
        title="Permissão bloqueada"
        description="Você bloqueou notificações para esta loja. Reabra nas configurações do navegador (cadeado da URL) para liberar."
      />
    );
  }
  if (status === 'unconfigured' && !vapidKey) {
    return (
      <Card
        tone="warn"
        title="Notificações ainda não disponíveis"
        description="A loja está configurando o servidor de notificações. Volte mais tarde — sem provider VAPID configurado, não conseguimos disparar avisos."
      />
    );
  }
  if (status === 'subscribed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card
          tone="ok"
          title="Notificações ativadas"
          description="Você receberá avisos de atualizações de pedido e promoções."
          action={
            <button
              onClick={unsubscribe}
              disabled={(status as Status) === 'unsubscribing'}
              style={{
                background: 'transparent',
                color: 'var(--text-primary, #111)',
                border: '1px solid var(--text-primary, #111)',
                borderRadius: 4,
                padding: '8px 14px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {(status as Status) === 'unsubscribing' ? 'Desativando…' : 'Desativar'}
            </button>
          }
        />
      </div>
    );
  }
  // idle / subscribing / error
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card
        title="Receber notificações"
        description="Atualizações de pedido, lembretes da wishlist e promoções selecionadas. Você pode desativar a qualquer momento."
        action={
          <button
            onClick={subscribe}
            disabled={!vapidKey || (status as Status) === 'subscribing'}
            style={{
              background: 'var(--accent, #B8956A)',
              color: 'var(--text-on-dark, #fff)',
              border: 'none',
              borderRadius: 4,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: vapidKey ? 'pointer' : 'not-allowed',
              opacity: vapidKey ? 1 : 0.6,
            }}
          >
            {(status as Status) === 'subscribing' ? 'Aguardando…' : 'Ativar'}
          </button>
        }
      />
      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}
