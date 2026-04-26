'use client';

import { useState, useEffect } from 'react';
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
  updatedAt: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  open:        { bg: '#EFF6FF', text: '#1D4ED8', label: 'Aberto' },
  in_progress: { bg: '#FFF7ED', text: '#92400E', label: 'Em andamento' },
  resolved:    { bg: '#F0FDF4', text: '#166534', label: 'Resolvido' },
  closed:      { bg: '#F9FAFB', text: '#6B7280', label: 'Fechado' },
};

const PRIORITY_STYLE: Record<string, { text: string; label: string }> = {
  low:    { text: '#6B7280', label: 'Baixa' },
  medium: { text: '#D97706', label: 'Média' },
  high:   { text: '#DC2626', label: 'Alta' },
  urgent: { text: '#7C3AED', label: 'Urgente' },
};

function slaStatus(slaDeadlineAt: string | null, status: string): 'expired' | 'warning' | 'ok' | 'none' {
  if (!slaDeadlineAt || status === 'resolved' || status === 'closed') return 'none';
  const deadline = new Date(slaDeadlineAt).getTime();
  const now = Date.now();
  if (now > deadline) return 'expired';
  if (deadline - now < 2 * 60 * 60 * 1000) return 'warning';
  return 'ok';
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    fetch(`/api/tickets?${params}`)
      .then(r => r.json())
      .then((d: { tickets: Ticket[] }) => { setTickets(d.tickets ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(load, [statusFilter, priorityFilter]);

  const openCount = tickets.filter(t => t.status === 'open').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent').length;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Suporte</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Tickets de atendimento ao cliente</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {openCount > 0 && (
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>
              {openCount} aberto{openCount !== 1 ? 's' : ''}
            </span>
          )}
          {urgentCount > 0 && (
            <span style={{ background: '#F5F3FF', color: '#7C3AED', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>
              {urgentCount} urgente{urgentCount !== 1 ? 's' : ''}
            </span>
          )}
          <Link href="/tickets/templates" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 12px' }}>
            📋 Templates
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
        >
          <option value="">Todos os status</option>
          <option value="open">Abertos</option>
          <option value="in_progress">Em andamento</option>
          <option value="resolved">Resolvidos</option>
          <option value="closed">Fechados</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
        >
          <option value="">Todas as prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
      </div>

      {loading && <p style={{ color: '#6B7280', fontSize: 14 }}>Carregando…</p>}

      {!loading && tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF' }}>
          <p style={{ fontSize: 16 }}>Nenhum ticket encontrado.</p>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tickets.map(ticket => {
            const ss = STATUS_STYLE[ticket.status] ?? STATUS_STYLE['open']!;
            const ps = PRIORITY_STYLE[ticket.priority] ?? PRIORITY_STYLE['medium']!;
            const sla = slaStatus(ticket.slaDeadlineAt, ticket.status);
            return (
              <div key={ticket.id} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</span>
                    <span style={{ background: ss.bg, color: ss.text, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>{ss.label}</span>
                    {sla === 'expired' && <span style={{ background: '#FEF2F2', color: '#991B1B', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>SLA expirado</span>}
                    {sla === 'warning' && <span style={{ background: '#FFF7ED', color: '#92400E', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>SLA &lt;2h</span>}
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>
                    <span style={{ color: ps.text, fontWeight: 600 }}>{ps.label}</span>
                    {' · '}{ticket.customerName} &lt;{ticket.customerEmail}&gt;
                    {' · '}{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                    {ticket.orderId && <span> · Pedido vinculado</span>}
                  </p>
                </div>
                <Link
                  href={`/tickets/${ticket.id}`}
                  style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Ver →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
