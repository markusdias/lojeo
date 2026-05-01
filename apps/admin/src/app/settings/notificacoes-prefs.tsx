'use client';

import { useEffect, useState } from 'react';

interface PrefsResp {
  disabledTypes: string[];
  knownTypes: string[];
}

const TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  'order.created': { label: 'Novo pedido', desc: 'Quando alguém faz um pedido novo na loja.' },
  'order.paid': { label: 'Pagamento confirmado', desc: 'Quando o gateway confirma pagamento (Pix recebido, cartão aprovado).' },
  'review.pending': { label: 'Avaliação pendente', desc: 'Cliente deixou uma avaliação que aguarda sua moderação.' },
  'return.requested': { label: 'Devolução / troca solicitada', desc: 'Cliente abriu solicitação de devolução, troca ou garantia.' },
  'inventory.low_stock': { label: 'Estoque baixo', desc: 'Variante atingiu o limite mínimo configurado.' },
  'restock.demand': { label: 'Demanda alta para reposição', desc: '5+ clientes pediram "avise-me quando voltar" no mesmo produto.' },
  'fiscal.failed': { label: 'Falha na NF-e', desc: 'Emissão automática de nota fiscal falhou (Bling).' },
  'churn.alert': { label: 'Cliente em risco de churn', desc: 'Top clientes ficaram muito tempo sem comprar.' },
  'ticket.assigned': { label: 'Ticket atribuído a você', desc: 'Auto-assignment direcionou um chamado pra você.' },
};

export function NotificacoesPrefSection() {
  const [data, setData] = useState<PrefsResp | null>(null);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notifications/preferences', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: PrefsResp) => {
        setData(d);
        setDisabled(new Set(d.disabledTypes));
      });
  }, []);

  function toggle(type: string) {
    setDisabled(prev => {
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
      setMsg(r.ok ? 'Preferências salvas.' : 'Falha ao salvar — tente novamente.');
    } catch {
      setMsg('Erro de rede.');
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <div style={{ padding: 'var(--space-6)', color: 'var(--fg-muted)', fontSize: 'var(--text-body-s)' }}>Carregando…</div>;
  }

  return (
    <div className="lj-card" style={{ padding: 'var(--space-6)' }}>
      <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-2)' }}>
        Preferências de notificação
      </h2>
      <p style={{ fontSize: 'var(--text-body-s)', color: 'var(--fg-secondary)', marginBottom: 'var(--space-5)' }}>
        Escolha quais eventos geram alertas no sino. Mudanças valem para toda a equipe.
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {data.knownTypes.map(type => {
          const meta = TYPE_LABELS[type] ?? { label: type, desc: '' };
          const isOn = !disabled.has(type);
          return (
            <li
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                background: isOn ? 'var(--bg-elevated)' : 'var(--neutral-50, #fafaf8)',
              }}
            >
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 'var(--text-body)', fontWeight: 'var(--w-semibold)', color: 'var(--fg)' }}>
                  {meta.label}
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--text-body-s)', color: 'var(--fg-secondary)', lineHeight: 1.45 }}>
                  {meta.desc}
                </p>
                <code style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'block', marginTop: 4 }}>{type}</code>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`${meta.label}: ${isOn ? 'ativado' : 'desativado'}`}
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

      <div style={{ marginTop: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="lj-btn-primary"
          style={{ padding: '10px 18px', fontSize: 'var(--text-body-s)', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Salvando…' : 'Salvar preferências'}
        </button>
        {msg && (
          <span style={{ fontSize: 'var(--text-body-s)', color: msg.includes('Falha') || msg.includes('Erro') ? 'var(--error)' : 'var(--fg-secondary)' }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
