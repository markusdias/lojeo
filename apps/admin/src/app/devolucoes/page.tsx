'use client';

import { useEffect, useState } from 'react';

interface ReturnRequest {
  id: string;
  orderId: string;
  orderItemId: string | null;
  userId: string | null;
  customerEmail: string | null;
  type: string; // exchange | refund | store_credit
  reason: string;
  reasonDetails: string | null;
  status: string;
  resolutionNotes: string | null;
  refundCents: number | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  receivedAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  requested:        { cls: 'lj-badge lj-badge-warning', label: 'Solicitado' },
  analyzing:        { cls: 'lj-badge lj-badge-info',    label: 'Em análise' },
  approved:         { cls: 'lj-badge lj-badge-accent',  label: 'Aprovado' },
  rejected:         { cls: 'lj-badge lj-badge-error',   label: 'Rejeitado' },
  awaiting_product: { cls: 'lj-badge lj-badge-info',    label: 'Aguardando peça' },
  received:         { cls: 'lj-badge lj-badge-accent',  label: 'Peça recebida' },
  finalized:        { cls: 'lj-badge lj-badge-success', label: 'Finalizado' },
};

const TYPE_LABEL: Record<string, string> = {
  exchange: 'Troca',
  refund: 'Reembolso',
  store_credit: 'Crédito da loja',
};

const REASON_LABEL: Record<string, string> = {
  wrong_item: 'Item errado',
  damaged: 'Avariado',
  no_longer_wanted: 'Não quer mais',
  wrong_size: 'Tamanho errado',
  other: 'Outro',
};

const STATUS_OPTIONS = [
  { v: '', label: 'Todos' },
  { v: 'requested', label: 'Solicitado' },
  { v: 'analyzing', label: 'Em análise' },
  { v: 'approved', label: 'Aprovado' },
  { v: 'awaiting_product', label: 'Aguardando peça' },
  { v: 'received', label: 'Recebido' },
  { v: 'finalized', label: 'Finalizado' },
  { v: 'rejected', label: 'Rejeitado' },
];

const TYPE_OPTIONS = [
  { v: '', label: 'Todos os tipos' },
  { v: 'exchange', label: 'Troca' },
  { v: 'refund', label: 'Reembolso' },
  { v: 'store_credit', label: 'Crédito' },
];

const DAYS_OPTIONS = [
  { v: '30', label: '30d' },
  { v: '90', label: '90d' },
  { v: '180', label: '180d' },
  { v: '365', label: '1 ano' },
];

function fmtDate(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtCents(cents: number | null): string {
  if (cents === null) return '—';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ALLOWED_NEXT: Record<string, string[]> = {
  requested:        ['analyzing', 'approved', 'rejected'],
  analyzing:        ['approved', 'rejected'],
  approved:         ['awaiting_product'],
  awaiting_product: ['received'],
  received:         ['finalized'],
  rejected:         [],
  finalized:        [],
};

const ACTION_LABEL: Record<string, string> = {
  analyzing: 'Marcar em análise',
  approved: 'Aprovar',
  rejected: 'Rejeitar',
  awaiting_product: 'Solicitar envio da peça',
  received: 'Marcar como recebido',
  finalized: 'Finalizar',
};

export default function DevolucoesPage() {
  const [list, setList] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [days, setDays] = useState('90');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refundReais, setRefundReais] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (days) params.set('days', days);
    fetch(`/api/returns?${params.toString()}`)
      .then(async r => {
        const d = (await r.json()) as { returns?: ReturnRequest[]; error?: string };
        if (!r.ok) {
          setError(d.error ?? `HTTP ${r.status}`);
          setList([]);
        } else {
          setList(d.returns ?? []);
          setError('');
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter, typeFilter, days]);

  async function transition(r: ReturnRequest, nextStatus: string) {
    setBusyId(r.id);
    try {
      const payload: Record<string, unknown> = { status: nextStatus };
      if (notes[r.id]) payload.resolutionNotes = notes[r.id];
      const reais = Number(refundReais[r.id] ?? '');
      if (nextStatus === 'approved' && Number.isFinite(reais) && reais > 0) {
        payload.refundCents = Math.round(reais * 100);
      }
      const res = await fetch(`/api/returns/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`Erro: ${d.error ?? res.status}`);
        return;
      }
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>
          Devoluções e trocas
        </h1>
        <p className="body-s">
          Solicitações abertas pelos clientes. Aprovar gera estado &quot;aguardando peça&quot;; ao receber, marque como recebido e finalize.
        </p>
      </header>

      <div className="lj-card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginBottom: 4 }}>Status</label>
          <select className="lj-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginBottom: 4 }}>Tipo</label>
          <select className="lj-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginBottom: 4 }}>Período</label>
          <select className="lj-input" value={days} onChange={e => setDays(e.target.value)}>
            {DAYS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="body-s">Carregando…</p>
      ) : error ? (
        <div className="lj-card" style={{ padding: 'var(--space-3)', borderColor: 'var(--warning)', background: 'var(--warning-soft)' }}>
          <p className="body-s" style={{ color: 'var(--warning)' }}>{error}</p>
        </div>
      ) : list.length === 0 ? (
        <p className="body-s">Nenhuma solicitação encontrada para os filtros selecionados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(r => {
            const badge = STATUS_BADGE[r.status] ?? { cls: 'lj-badge lj-badge-neutral', label: r.status };
            const isOpen = openId === r.id;
            const allowed = ALLOWED_NEXT[r.status] ?? [];
            return (
              <div key={r.id} className="lj-card" style={{ padding: '16px 20px' }}>
                <button
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span className={badge.cls}>{badge.label}</span>
                        <span className="lj-badge lj-badge-neutral">{TYPE_LABEL[r.type] ?? r.type}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>
                        Pedido <span style={{ fontFamily: 'monospace' }}>{r.orderId.slice(0, 8)}</span>
                        {r.orderItemId ? ' · item específico' : ' · pedido inteiro'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--neutral-500)' }}>
                        {r.customerEmail ?? '—'} · motivo: {REASON_LABEL[r.reason] ?? r.reason}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, color: 'var(--neutral-500)' }}>{fmtDate(r.createdAt)}</p>
                      {r.refundCents !== null && (
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{fmtCents(r.refundCents)}</p>
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--neutral-100)' }}>
                    {r.reasonDetails && (
                      <div style={{ marginBottom: 12 }}>
                        <p className="eyebrow" style={{ marginBottom: 4 }}>Detalhes do cliente</p>
                        <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.reasonDetails}</p>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
                      <div>
                        <p className="caption">Aprovado em</p>
                        <p className="text-sm">{fmtDate(r.approvedAt)}</p>
                      </div>
                      <div>
                        <p className="caption">Rejeitado em</p>
                        <p className="text-sm">{fmtDate(r.rejectedAt)}</p>
                      </div>
                      <div>
                        <p className="caption">Recebido em</p>
                        <p className="text-sm">{fmtDate(r.receivedAt)}</p>
                      </div>
                      <div>
                        <p className="caption">Finalizado em</p>
                        <p className="text-sm">{fmtDate(r.finalizedAt)}</p>
                      </div>
                    </div>

                    {r.resolutionNotes && (
                      <div style={{ marginBottom: 12 }}>
                        <p className="eyebrow" style={{ marginBottom: 4 }}>Notas internas</p>
                        <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.resolutionNotes}</p>
                      </div>
                    )}

                    {allowed.length > 0 && (
                      <>
                        <div style={{ marginBottom: 8 }}>
                          <label className="block" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginBottom: 4 }}>Notas internas (opcional)</label>
                          <textarea
                            className="lj-input w-full"
                            rows={2}
                            value={notes[r.id] ?? ''}
                            onChange={e => setNotes({ ...notes, [r.id]: e.target.value })}
                            placeholder="Visível apenas para a equipe"
                          />
                        </div>
                        {allowed.includes('approved') && (
                          <div style={{ marginBottom: 8 }}>
                            <label className="block" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginBottom: 4 }}>Valor de reembolso (R$, opcional)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="lj-input"
                              style={{ width: 180 }}
                              value={refundReais[r.id] ?? ''}
                              onChange={e => setRefundReais({ ...refundReais, [r.id]: e.target.value })}
                              placeholder="0,00"
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {allowed.map(next => (
                            <button
                              key={next}
                              disabled={busyId === r.id}
                              onClick={() => transition(r, next)}
                              className={next === 'rejected' ? 'lj-btn-secondary' : 'lj-btn-primary'}
                              style={{ padding: '6px 14px', fontSize: 13 }}
                            >
                              {ACTION_LABEL[next] ?? next}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {allowed.length === 0 && (
                      <p className="caption">Status final — nenhuma transição disponível.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
