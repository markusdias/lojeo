'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';

interface Ticket {
  id: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: string;
  priority: string;
  source: string;
  orderId: string | null;
  slaDeadlineAt: string | null;
  createdAt: string;
}

interface Message {
  id: string;
  senderType: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const SENDER_LABEL: Record<string, string> = {
  customer: 'Cliente',
  admin: 'Suporte',
  bot: 'Bot',
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadTicket() {
    const [tr, mr] = await Promise.all([
      fetch(`/api/tickets/${id}`).then(r => r.json()) as Promise<{ ticket: Ticket }>,
      fetch(`/api/tickets/${id}/messages`).then(r => r.json()) as Promise<{ messages: Message[] }>,
    ]);
    setTicket(tr.ticket ?? null);
    setMessages(mr.messages ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadTicket(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    await fetch(`/api/tickets/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: reply.trim(), isInternal }),
    });
    setReply('');
    setSending(false);
    void loadTicket();
  }

  async function handleStatusChange(status: string) {
    setSaving(true);
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    void loadTicket();
  }

  async function handlePriorityChange(priority: string) {
    setSaving(true);
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    });
    setSaving(false);
    void loadTicket();
  }

  if (loading) return <div className="p-8" style={{ color: '#6B7280', fontSize: 14 }}>Carregando…</div>;
  if (!ticket) return <div className="p-8" style={{ color: '#9CA3AF', fontSize: 14 }}>Ticket não encontrado.</div>;

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
        <Link href="/tickets" style={{ color: '#2563EB', textDecoration: 'none' }}>Suporte</Link>
        {' › '}{ticket.subject}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        {/* Thread */}
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{ticket.subject}</h1>

          {/* Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>Nenhuma mensagem ainda.</p>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: msg.isInternal ? '#FFFBEB' : msg.senderType === 'admin' ? '#F0F9FF' : '#F9FAFB',
                  border: msg.isInternal ? '1px dashed #D97706' : '1px solid #E5E7EB',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: msg.isInternal ? '#92400E' : '#374151' }}>
                    {SENDER_LABEL[msg.senderType] ?? msg.senderType}
                    {msg.isInternal && ' (nota interna)'}
                  </span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {new Date(msg.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', margin: 0 }}>{msg.body}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply form */}
          <form onSubmit={e => { void handleReply(e); }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={isInternal ? 'Nota interna (visível só para a equipe)…' : 'Resposta ao cliente…'}
              rows={5}
              style={{
                width: '100%',
                border: `1px solid ${isInternal ? '#D97706' : '#D1D5DB'}`,
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={e => setIsInternal(e.target.checked)}
                />
                Nota interna
              </label>
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                style={{
                  background: isInternal ? '#D97706' : '#111827',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: sending || !reply.trim() ? 0.6 : 1,
                }}
              >
                {sending ? 'Enviando…' : isInternal ? 'Salvar nota' : 'Responder'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</p>
            <select
              value={ticket.status}
              onChange={e => { void handleStatusChange(e.target.value); }}
              disabled={saving}
              style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', margin: '16px 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prioridade</p>
            <select
              value={ticket.priority}
              onChange={e => { void handlePriorityChange(e.target.value); }}
              disabled={saving}
              style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
            >
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</p>
            <p style={{ fontSize: 13, fontWeight: 500 }}>{ticket.customerName}</p>
            <p style={{ fontSize: 12, color: '#6B7280' }}>{ticket.customerEmail}</p>
            {ticket.orderId && (
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
                Pedido: <Link href={`/pedidos/${ticket.orderId}`} style={{ color: '#2563EB' }}>ver pedido →</Link>
              </p>
            )}
          </div>

          <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalhes</p>
            <p style={{ fontSize: 12, color: '#6B7280' }}>Origem: {ticket.source}</p>
            <p style={{ fontSize: 12, color: '#6B7280' }}>Criado: {new Date(ticket.createdAt).toLocaleString('pt-BR')}</p>
            {ticket.slaDeadlineAt && (
              <p style={{ fontSize: 12, color: new Date(ticket.slaDeadlineAt) < new Date() ? '#DC2626' : '#6B7280' }}>
                SLA: {new Date(ticket.slaDeadlineAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
