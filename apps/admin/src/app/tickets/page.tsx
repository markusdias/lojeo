'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { EmptyState, IconHeadset } from '../../components/ui/empty-state';

interface Ticket {
  id: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: string;
  priority: string;
  source: string;
  orderId: string | null;
  assignedToUserId: string | null;
  slaDeadlineAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssignableUser {
  userId: string;
  email: string;
  role: string;
}

const ASSIGNABLE_ROLES = ['owner', 'admin', 'operador', 'atendimento'];

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const PRIORITY_BAR: Record<string, string> = {
  low: 'var(--neutral-200)',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#B91C1C',
};

type SLAState = 'late' | 'urgent' | 'ok' | 'done' | 'none';

function slaState(t: Ticket): SLAState {
  if (t.status === 'resolved') return 'done';
  if (t.status === 'closed' || !t.slaDeadlineAt) return 'none';
  const deadline = new Date(t.slaDeadlineAt).getTime();
  const now = Date.now();
  if (now > deadline) return 'late';
  if (deadline - now < 3 * 60 * 60 * 1000) return 'urgent';
  return 'ok';
}

function slaLabel(t: Ticket, state: SLAState): string {
  if (state === 'done') return 'Resolvido';
  if (state === 'none') return 'Sem SLA';
  if (!t.slaDeadlineAt) return '—';
  const diff = new Date(t.slaDeadlineAt).getTime() - Date.now();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const d = Math.floor(h / 24);
  const fmt = d > 0 ? `${d}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  if (state === 'late') return `Atrasado · ${fmt}`;
  return `Vence em ${fmt}`;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

const FILTERS: { id: string; label: string; match: (t: Ticket) => boolean }[] = [
  { id: 'todos',      label: 'Todos',              match: () => true },
  { id: 'open',       label: 'Abertos',            match: t => t.status === 'open' },
  { id: 'in_progress',label: 'Em andamento',       match: t => t.status === 'in_progress' },
  { id: 'resolved',   label: 'Resolvidos',         match: t => t.status === 'resolved' },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/users').then((r) => r.ok ? r.json() : { users: [] }).catch(() => ({ users: [] })),
      ]);
      const d1 = await r1.json();
      setTickets(d1.tickets ?? []);
      const fetchedUsers: AssignableUser[] = (r2.users ?? [])
        .filter((u: AssignableUser) => ASSIGNABLE_ROLES.includes(u.role));
      setUsers(fetchedUsers);
    } catch { /* keep state */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  const userById = useMemo(() => {
    const m = new Map<string, AssignableUser>();
    for (const u of users) m.set(u.userId, u);
    return m;
  }, [users]);

  async function handleAssign(ticketId: string, userId: string | null) {
    setAssigningId(null);
    try {
      const r = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!r.ok) return;
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, assignedToUserId: userId } : t));
    } catch { /* swallow */ }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: tickets.length };
    for (const f of FILTERS) c[f.id] = tickets.filter(f.match).length;
    return c;
  }, [tickets]);

  const filtered = useMemo(
    () => tickets.filter(FILTERS.find(f => f.id === filter)?.match ?? (() => true)),
    [tickets, filter],
  );

  const lateCount = tickets.filter(t => slaState(t) === 'late').length;
  const activeCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Tickets</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-secondary)', margin: '4px 0 0' }}>
            {activeCount} ativos{lateCount > 0 ? ` · ${lateCount} atrasado${lateCount > 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/tickets/rules" className="lj-btn-secondary" style={{ textDecoration: 'none' }}>
            Regras
          </Link>
          <Link href="/tickets/templates" className="lj-btn-secondary" style={{ textDecoration: 'none' }}>
            Templates
          </Link>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 30, padding: '0 12px', borderRadius: 999,
                border: `1px solid ${active ? 'var(--neutral-900)' : 'var(--border)'}`,
                background: active ? 'var(--neutral-900)' : 'transparent',
                color: active ? 'var(--paper)' : 'var(--fg-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'all 140ms var(--ease-out)',
              }}
            >
              {f.label}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                padding: '1px 6px', borderRadius: 99,
                background: active ? 'rgba(255,255,255,0.15)' : 'var(--neutral-100)',
                color: active ? 'rgba(255,255,255,0.85)' : 'var(--fg-secondary)',
              }}>
                {counts[f.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading && <p style={{ color: 'var(--fg-secondary)', fontSize: 14, padding: '24px 0' }}>Carregando…</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '24px 0' }}>
          <EmptyState
            icon={<IconHeadset />}
            title="Nenhum ticket encontrado"
            description="Tickets criados pelo cliente via storefront, chatbot ou WhatsApp aparecerão aqui."
            action={{ label: 'Configurar chatbot', href: '/chatbot' }}
            secondaryAction={{ label: 'Ver templates', href: '/tickets/templates' }}
          />
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
          {filtered.map(t => {
            const sla = slaState(t);
            const slaColor =
              sla === 'late'   ? '#B91C1C' :
              sla === 'urgent' ? '#B45309' :
              sla === 'done'   ? '#047857' :
                                 'var(--fg-secondary)';
            return (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '4px 1fr auto',
                  gap: 14, alignItems: 'center',
                  padding: '14px 16px 14px 4px',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'background 120ms var(--ease-out)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Priority bar */}
                <div
                  title={`Prioridade: ${PRIORITY_LABEL[t.priority] ?? t.priority}`}
                  style={{
                    width: 4, height: 44, borderRadius: 2, alignSelf: 'center',
                    background: PRIORITY_BAR[t.priority] ?? 'var(--neutral-200)',
                    boxShadow: t.priority === 'urgent' ? '0 0 0 2px rgba(185,28,28,0.15)' : undefined,
                  }}
                />

                {/* Main */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-secondary)', fontWeight: 500 }}>
                      {t.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={
                      t.status === 'open' ? 'lj-badge lj-badge-info' :
                      t.status === 'in_progress' ? 'lj-badge lj-badge-warning' :
                      t.status === 'resolved' ? 'lj-badge lj-badge-success' :
                      'lj-badge lj-badge-neutral'
                    } style={{ fontSize: 11 }}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    {t.orderId && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                        #{t.orderId.slice(0, 8)}
                      </span>
                    )}
                    <span style={{
                      marginLeft: 'auto',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      fontWeight: sla === 'late' ? 600 : 500,
                      color: slaColor,
                    }}>
                      {sla === 'urgent' && (
                        <span
                          aria-hidden
                          style={{
                            width: 6, height: 6, borderRadius: 999,
                            background: '#F59E0B',
                            animation: 'lj-sla-pulse 1.6s ease-in-out infinite',
                          }}
                        />
                      )}
                      {slaLabel(t, sla)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: 'var(--fg)',
                    marginBottom: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.subject}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.45,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{t.customerName}:</span>{' '}
                    {t.customerEmail}
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  {/* Atribuído a */}
                  <div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAssigningId(assigningId === t.id ? null : t.id); }}
                    role="button"
                    tabIndex={0}
                    aria-label={t.assignedToUserId ? `Atribuído a ${userById.get(t.assignedToUserId)?.email ?? t.assignedToUserId}` : 'Não atribuído'}
                    style={{
                      position: 'relative',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '3px 8px', borderRadius: 999,
                      border: `1px dashed ${t.assignedToUserId ? 'var(--accent)' : 'var(--border)'}`,
                      background: t.assignedToUserId ? 'var(--accent-soft)' : 'transparent',
                      color: t.assignedToUserId ? 'var(--accent)' : 'var(--fg-muted)',
                      fontSize: 11, cursor: 'pointer', minWidth: 110,
                    }}
                  >
                    {t.assignedToUserId
                      ? (userById.get(t.assignedToUserId)?.email?.split('@')[0] ?? 'Atribuído')
                      : 'Atribuir'}
                    {assigningId === t.id && (
                      <div
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        style={{
                          position: 'absolute', top: '100%', right: 0, marginTop: 4,
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: 4,
                          boxShadow: 'var(--shadow-sm)', zIndex: 10, minWidth: 200,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleAssign(t.id, null)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '6px 10px', fontSize: 12, color: 'var(--fg-secondary)',
                            background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 4,
                          }}
                        >
                          — Sem atribuição —
                        </button>
                        {users.map((u) => (
                          <button
                            key={u.userId}
                            type="button"
                            onClick={() => handleAssign(t.id, u.userId)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '6px 10px', fontSize: 12, color: 'var(--fg)',
                              background: t.assignedToUserId === u.userId ? 'var(--accent-soft)' : 'transparent',
                              border: 'none', cursor: 'pointer', borderRadius: 4,
                            }}
                          >
                            {u.email}
                          </button>
                        ))}
                        {users.length === 0 && (
                          <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--fg-muted)' }}>
                            Sem usuários atribuíveis
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg-secondary)', minWidth: 140 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 999,
                      background: 'linear-gradient(135deg, #6B7280, #9CA3AF)',
                      color: '#fff', fontSize: 10, fontWeight: 500,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {initials(t.customerName)}
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.customerName}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', minWidth: 56, textAlign: 'right' }}>
                    {relTime(t.updatedAt ?? t.createdAt)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes lj-sla-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
      `}</style>
    </div>
  );
}
