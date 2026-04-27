'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';

interface Notif {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 60_000;

function relTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const SEVERITY_DOT: Record<string, string> = {
  info: 'var(--accent, #C9A85C)',
  warning: '#E8A33D',
  critical: '#D14A3A',
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications?limit=15', { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as { notifications: Notif[]; unreadCount: number };
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
    }
  }, [open]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((n) => Math.max(0, n - 1));
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnread(0);
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="lj-icon-btn"
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ''}`}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ position: 'relative' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M9 2v.5M5.25 5.25v3.5l-1 2.25h9.5l-1-2.25v-3.5a3.75 3.75 0 1 0-7.5 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7.5 13a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 8,
              background: '#D14A3A',
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #e5e5e5)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border, #e5e5e5)',
          }}>
            <strong style={{ fontSize: 14, color: 'var(--fg)' }}>Notificações</strong>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--fg-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && items.length === 0 && (
              <div style={{ padding: 20, fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center' }}>
                Carregando…
              </div>
            )}
            {!loading && items.length === 0 && (
              <div style={{ padding: 28, fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center' }}>
                Nenhuma notificação ainda.<br />
                <span style={{ fontSize: 12 }}>Pedidos novos, devoluções e alertas aparecem aqui.</span>
              </div>
            )}
            {items.map((n) => {
              const Inner = (
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle, #f0f0f0)',
                    background: n.readAt ? 'transparent' : 'var(--neutral-50, #fafaf8)',
                    cursor: n.link ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: SEVERITY_DOT[n.severity] ?? SEVERITY_DOT.info,
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 13, color: 'var(--fg)', fontWeight: n.readAt ? 500 : 600 }}>
                          {n.title}
                        </strong>
                        <span style={{ fontSize: 11, color: 'var(--fg-muted)', flexShrink: 0 }}>{relTime(n.createdAt)}</span>
                      </div>
                      {n.body && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.4 }}>
                          {n.body}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
              return n.link ? (
                <Link
                  key={n.id}
                  href={n.link}
                  prefetch={false}
                  onClick={() => {
                    if (!n.readAt) void markRead(n.id);
                    setOpen(false);
                  }}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {Inner}
                </Link>
              ) : (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.readAt) void markRead(n.id);
                  }}
                >
                  {Inner}
                </div>
              );
            })}
          </div>

          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border, #e5e5e5)',
            textAlign: 'center',
          }}>
            <Link
              href="/notificacoes"
              prefetch={false}
              onClick={() => setOpen(false)}
              style={{ fontSize: 12, color: 'var(--fg-secondary)' }}
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
