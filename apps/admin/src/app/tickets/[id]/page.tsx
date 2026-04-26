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

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--text-caption)',
  fontWeight: 'var(--w-semibold)',
  color: 'var(--fg-secondary)',
  marginBottom: 'var(--space-3)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--track-wide)',
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

  if (loading) return <div style={{ padding: 'var(--space-8)' }}><p className="body-s">Carregando…</p></div>;
  if (!ticket) return <div style={{ padding: 'var(--space-8)' }}><p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Ticket não encontrado.</p></div>;

  const slaExpired = ticket.slaDeadlineAt && new Date(ticket.slaDeadlineAt) < new Date();

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <Link href="/tickets" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', textDecoration: 'none' }}>
        ← Suporte
      </Link>

      <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {ticket.subject}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Thread */}
        <div style={{ minWidth: 0 }}>
          {/* Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {messages.length === 0 && (
              <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Nenhuma mensagem ainda.</p>
            )}
            {messages.map(msg => {
              const isAdminMsg = msg.senderType === 'admin';
              const bg = msg.isInternal ? 'var(--warning-soft)' : isAdminMsg ? 'var(--info-soft)' : 'var(--bg-subtle)';
              const border = msg.isInternal ? 'var(--warning)' : 'var(--border)';
              return (
                <div
                  key={msg.id}
                  className="lj-card"
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: bg,
                    borderColor: border,
                    borderStyle: msg.isInternal ? 'dashed' : 'solid',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--w-semibold)',
                      color: msg.isInternal ? 'var(--warning)' : 'var(--fg)',
                    }}>
                      {SENDER_LABEL[msg.senderType] ?? msg.senderType}
                      {msg.isInternal && ' (nota interna)'}
                    </span>
                    <span className="caption numeric">
                      {new Date(msg.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="body-s" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.body}</p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply form */}
          <form onSubmit={e => { void handleReply(e); }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={isInternal ? 'Nota interna (visível só para a equipe)…' : 'Resposta ao cliente…'}
              rows={5}
              className="lj-input"
              style={{
                width: '100%',
                resize: 'vertical',
                borderColor: isInternal ? 'var(--warning)' : undefined,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-body-s)', cursor: 'pointer' }}>
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
                className={isInternal ? 'lj-btn-secondary' : 'lj-btn-primary'}
                style={isInternal ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : undefined}
              >
                {sending ? 'Enviando…' : isInternal ? 'Salvar nota' : 'Responder'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
            <p style={sectionLabelStyle}>Status</p>
            <select
              value={ticket.status}
              onChange={e => { void handleStatusChange(e.target.value); }}
              disabled={saving}
              className="lj-input"
              style={{ width: '100%' }}
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <p style={{ ...sectionLabelStyle, marginTop: 'var(--space-4)' }}>Prioridade</p>
            <select
              value={ticket.priority}
              onChange={e => { void handlePriorityChange(e.target.value); }}
              disabled={saving}
              className="lj-input"
              style={{ width: '100%' }}
            >
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
            <p style={sectionLabelStyle}>Cliente</p>
            <p className="body-s" style={{ fontWeight: 'var(--w-medium)' }}>{ticket.customerName}</p>
            <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>{ticket.customerEmail}</p>
            {ticket.orderId && (
              <p className="body-s" style={{ color: 'var(--fg-secondary)', marginTop: 'var(--space-2)' }}>
                Pedido: <Link href={`/pedidos/${ticket.orderId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}>ver pedido →</Link>
              </p>
            )}
          </div>

          <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
            <p style={sectionLabelStyle}>Detalhes</p>
            <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Origem: {ticket.source}</p>
            <p className="body-s numeric" style={{ color: 'var(--fg-secondary)' }}>
              Criado: {new Date(ticket.createdAt).toLocaleString('pt-BR')}
            </p>
            {ticket.slaDeadlineAt && (
              <p className="body-s numeric" style={{ color: slaExpired ? 'var(--error)' : 'var(--fg-secondary)' }}>
                SLA: {new Date(ticket.slaDeadlineAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
