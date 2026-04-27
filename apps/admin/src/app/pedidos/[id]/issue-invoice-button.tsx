'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  hasInvoice: boolean;
  status: string;
}

const ELIGIBLE_STATUSES = new Set(['paid', 'preparing', 'shipped']);

export function IssueInvoiceButton({ orderId, hasInvoice, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (hasInvoice) return null;
  if (!ELIGIBLE_STATUSES.has(status)) return null;

  async function emit() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/invoice`, { method: 'POST' });
      const data = (await r.json()) as { ok?: boolean; source?: string; invoiceKey?: string; error?: string; message?: string };
      if (r.ok && data.ok) {
        setMsg({
          kind: 'ok',
          text: data.source === 'mock'
            ? 'NF-e simulada (Bling não conectado). Conecte em Integrações para emissão real.'
            : 'NF-e emitida com sucesso.',
        });
        router.refresh();
      } else {
        setMsg({ kind: 'err', text: data.message ?? data.error ?? 'Falha ao emitir' });
      }
    } catch (err) {
      setMsg({ kind: 'err', text: String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <button
        type="button"
        onClick={emit}
        disabled={busy}
        className="lj-btn-secondary"
        style={{ width: '100%' }}
      >
        {busy ? 'Emitindo NF-e…' : 'Emitir NF-e'}
      </button>
      {msg && (
        <p style={{
          marginTop: 'var(--space-2)',
          fontSize: 12,
          color: msg.kind === 'ok' ? 'var(--success)' : 'var(--error)',
        }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
