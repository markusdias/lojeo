'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PrefsResp {
  disabledTypes: string[];
  knownTypes: string[];
}

const TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  'order.created': {
    label: 'Novo pedido',
    desc: 'Quando alguém faz um pedido novo na loja.',
  },
  'order.paid': {
    label: 'Pagamento confirmado',
    desc: 'Quando o gateway confirma pagamento (Pix recebido, cartão aprovado).',
  },
  'review.pending': {
    label: 'Avaliação pendente',
    desc: 'Cliente deixou uma avaliação que aguarda sua moderação.',
  },
  'return.requested': {
    label: 'Devolução / troca solicitada',
    desc: 'Cliente abriu solicitação de devolução, troca ou garantia.',
  },
  'inventory.low_stock': {
    label: 'Estoque baixo',
    desc: 'Variante atingiu o limite mínimo configurado.',
  },
  'restock.demand': {
    label: 'Demanda alta para reposição',
    desc: '5+ clientes pediram "avise-me quando voltar" no mesmo produto.',
  },
  'fiscal.failed': {
    label: 'Falha na NF-e',
    desc: 'Emissão automática de nota fiscal falhou (Bling).',
  },
  'churn.alert': {
    label: 'Cliente em risco de churn',
    desc: 'Top clientes ficaram muito tempo sem comprar.',
  },
  'ticket.assigned': {
    label: 'Ticket atribuído a você',
    desc: 'Auto-assignment direcionou um chamado pra você.',
  },
};

export default function NotificacoesPreferenciasPage() {
  const [data, setData] = useState<PrefsResp | null>(null);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notifications/preferences', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: PrefsResp) => {
        setData(d);
        setDisabled(new Set(d.disabledTypes));
      });
  }, []);

  function toggle(type: string) {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    setMsg(null);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ disabledTypes: Array.from(disabled) }),
      });
      if (r.ok) {
        setMsg('Preferências salvas.');
      } else {
        setMsg('Falha ao salvar — tente novamente.');
      }
    } catch {
      setMsg('Erro de rede.');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div style={{ padding: 40 }}>Carregando…</div>;

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 720, margin: '0 auto' }}>
      <nav style={{ marginBottom: 24, fontSize: 13, color: 'var(--fg-muted)' }}>
        <Link href="/notificacoes" style={{ color: 'inherit' }}>← Voltar para notificações</Link>
      </nav>

      <header style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
          Central de avisos
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 600 }}>Preferências de notificação</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-secondary)' }}>
          Desmarque tipos que você não quer receber. Mudanças valem para toda a equipe.
        </p>
      </header>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.knownTypes.map((type) => {
          const meta = TYPE_LABELS[type] ?? { label: type, desc: '' };
          const isOn = !disabled.has(type);
          return (
            <li
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: isOn ? 'var(--surface, #fff)' : 'var(--neutral-50, #fafaf8)',
              }}
            >
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{meta.label}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.45 }}>
                  {meta.desc}
                </p>
                <code style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'block', marginTop: 4 }}>{type}</code>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                onClick={() => toggle(type)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  background: isOn ? 'var(--accent, #C9A85C)' : 'var(--neutral-200, #d4d4d4)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 150ms',
                  flexShrink: 0,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: isOn ? 23 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 150ms',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            background: 'var(--fg)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
            fontWeight: 500,
          }}
        >
          {busy ? 'Salvando…' : 'Salvar preferências'}
        </button>
        {msg && (
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{msg}</span>
        )}
      </div>
    </div>
  );
}
