'use client';

import { useEffect, useState, useCallback } from 'react';

interface OrderItemLite {
  id: string;
  productName: string;
  variantName: string | null;
  qty: number;
}

interface OrderLite {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  items: OrderItemLite[];
}

interface ReturnRequest {
  id: string;
  orderId: string;
  orderItemId: string | null;
  type: string;
  reason: string;
  reasonDetails: string | null;
  status: string;
  refundCents: number | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  exchange: 'Troca',
  refund: 'Reembolso',
  store_credit: 'Crédito da loja',
};

const REASON_OPTIONS = [
  { v: 'wrong_item', label: 'Recebi item errado' },
  { v: 'damaged', label: 'Produto chegou avariado' },
  { v: 'wrong_size', label: 'Tamanho não serviu' },
  { v: 'no_longer_wanted', label: 'Não quero mais' },
  { v: 'other', label: 'Outro motivo' },
];

const STATUS_LABEL: Record<string, string> = {
  requested: 'Solicitado',
  analyzing: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  awaiting_product: 'Aguardando envio',
  received: 'Peça recebida',
  finalized: 'Finalizado',
};

const STATUS_COLOR: Record<string, string> = {
  requested: '#92400E',
  analyzing: '#1E40AF',
  approved: '#065F46',
  rejected: '#991B1B',
  awaiting_product: '#1E40AF',
  received: '#065F46',
  finalized: '#065F46',
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function ContaDevolucoesPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [orderId, setOrderId] = useState('');
  const [orderItemId, setOrderItemId] = useState(''); // '' = pedido inteiro
  const [type, setType] = useState('exchange');
  const [reason, setReason] = useState('wrong_item');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, oRes] = await Promise.all([
        fetch('/api/returns'),
        fetch('/api/conta/pedidos-elegiveis'),
      ]);
      const rData = (await rRes.json().catch(() => ({}))) as { returns?: ReturnRequest[]; error?: string };
      if (!rRes.ok) {
        setError(rData.error ?? `HTTP ${rRes.status}`);
      } else {
        setReturns(rData.returns ?? []);
        setError('');
      }
      // Endpoint pedidos-elegiveis pode não existir — degrada silenciosamente
      if (oRes.ok) {
        const oData = (await oRes.json().catch(() => ({}))) as { orders?: OrderLite[] };
        setOrders(oData.orders ?? []);
      } else {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedOrder = orders.find(o => o.id === orderId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) {
      alert('Selecione um pedido.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        orderId,
        type,
        reason,
        reasonDetails: details.trim() || null,
      };
      if (orderItemId) payload.orderItemId = orderItemId;

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        const map: Record<string, string> = {
          order_not_delivered: 'Este pedido ainda não foi entregue. Trocas só podem ser abertas após a entrega.',
          warranty_expired: 'O prazo de garantia deste produto já expirou.',
          order_not_found: 'Pedido não encontrado.',
          forbidden: 'Você não tem permissão para abrir devolução deste pedido.',
        };
        alert(map[d.error ?? ''] ?? `Erro: ${d.error ?? res.status}`);
        return;
      }
      setShowForm(false);
      setOrderId('');
      setOrderItemId('');
      setType('exchange');
      setReason('wrong_item');
      setDetails('');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Devoluções e trocas</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 500,
              background: 'var(--text-primary)', color: 'var(--text-on-dark)',
              borderRadius: 6, border: 'none', cursor: 'pointer',
            }}
          >
            Nova solicitação
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ border: '1px solid var(--divider)', borderRadius: 8, padding: 24, marginBottom: 32, background: 'var(--surface)' }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 500, marginTop: 0, marginBottom: 16 }}>Abrir solicitação</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Pedido</label>
            <select
              required
              value={orderId}
              onChange={e => { setOrderId(e.target.value); setOrderItemId(''); }}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid var(--divider)', borderRadius: 6 }}
            >
              <option value="">— Selecione —</option>
              {orders.map(o => (
                <option key={o.id} value={o.id} disabled={o.status !== 'delivered'}>
                  {o.orderNumber} · {STATUS_LABEL[o.status] ?? o.status} · {fmtDate(o.createdAt)}
                </option>
              ))}
            </select>
            {orders.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Você ainda não tem pedidos elegíveis para devolução. Apenas pedidos entregues podem ser devolvidos.
              </p>
            )}
          </div>

          {selectedOrder && selectedOrder.items.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Item específico (opcional)</label>
              <select
                value={orderItemId}
                onChange={e => setOrderItemId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid var(--divider)', borderRadius: 6 }}
              >
                <option value="">Pedido inteiro</option>
                {selectedOrder.items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.productName}{it.variantName ? ` · ${it.variantName}` : ''}{it.qty > 1 ? ` ×${it.qty}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>O que você deseja?</label>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(['exchange', 'refund', 'store_credit'] as const).map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                  <input type="radio" checked={type === t} onChange={() => setType(t)} /> {TYPE_LABEL[t]}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Motivo</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid var(--divider)', borderRadius: 6 }}
            >
              {REASON_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Detalhes (opcional)</label>
            <textarea
              rows={4}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Conte um pouco mais sobre o problema."
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid var(--divider)', borderRadius: 6, fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 500,
                background: 'var(--text-primary)', color: 'var(--text-on-dark)',
                borderRadius: 6, border: 'none', cursor: 'pointer',
              }}
            >
              {submitting ? 'Enviando…' : 'Enviar solicitação'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: '10px 20px', fontSize: 13,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--divider)', borderRadius: 6, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Carregando…</p>
      ) : error ? (
        <div style={{ padding: 12, background: '#FEF3C7', borderRadius: 6, fontSize: 14, color: '#92400E' }}>{error}</div>
      ) : returns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Você ainda não tem solicitações de devolução.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {returns.map(r => {
            const color = STATUS_COLOR[r.status] ?? 'var(--text-secondary)';
            return (
              <div key={r.id} style={{
                border: '1px solid var(--divider)', borderRadius: 8, padding: '16px 20px',
                background: 'var(--surface)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
                      {TYPE_LABEL[r.type] ?? r.type}
                      {r.orderItemId ? ' · 1 item' : ' · pedido inteiro'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.createdAt)}</p>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                    background: `${color}18`, color,
                  }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                {r.reasonDetails && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{r.reasonDetails}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
