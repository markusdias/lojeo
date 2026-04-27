'use client';

import { useEffect, useMemo, useState } from 'react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { RoleBadge } from './role-badge';
import { RoleCards } from './role-cards';
import { AuditPreview } from './audit-preview';

interface UserRoleRow {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  acceptedAt: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
  createdAt: string;
}

interface IssuedInvite {
  email: string;
  role: string;
  url: string;
}

const ROLES = [
  { v: 'owner', label: 'Owner', desc: 'Conta dona — todas permissões + billing' },
  { v: 'admin', label: 'Admin', desc: 'Todas exceto billing' },
  { v: 'operador', label: 'Operador', desc: 'Pedidos + atendimento + leitura' },
  { v: 'editor', label: 'Editor', desc: 'Produtos + UGC + uploads' },
  { v: 'atendimento', label: 'Atendimento', desc: 'Tickets + chatbot + leitura' },
  { v: 'financeiro', label: 'Financeiro', desc: 'Pedidos + relatórios + cupons' },
];

const ROLE_LABEL: Record<string, string> = ROLES.reduce((a, r) => ({ ...a, [r.v]: r.label }), {});

function initialsFor(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]/).filter(Boolean);
  const a = parts[0]?.[0] ?? local[0] ?? '?';
  const b = parts[1]?.[0] ?? local[1] ?? '';
  return (a + b).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #00553D, #34C796)',
  'linear-gradient(135deg, #1D4ED8, #60A5FA)',
  'linear-gradient(135deg, #BE123C, #FB7185)',
  'linear-gradient(135deg, #6D28D9, #A78BFA)',
  'linear-gradient(135deg, #92400E, #FBBF24)',
  'linear-gradient(135deg, #134E4A, #2DD4BF)',
];

function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length] as string;
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('atendimento');
  const [saving, setSaving] = useState(false);
  const [issuedInvite, setIssuedInvite] = useState<IssuedInvite | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [filter, setFilter] = useState<string>('todos');

  function buildAbsoluteUrl(path: string): string {
    if (typeof window === 'undefined') return path;
    if (path.startsWith('http')) return path;
    return `${window.location.origin}${path}`;
  }

  function load() {
    setLoading(true);
    Promise.all([
      fetch('/api/users').then(async r => {
        const d = await r.json() as { users?: UserRoleRow[]; error?: string };
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
        return d.users ?? [];
      }),
      fetch('/api/users/invites').then(async r => {
        const d = await r.json() as { invites?: PendingInvite[]; error?: string };
        if (!r.ok) return [];
        return d.invites ?? [];
      }),
    ])
      .then(([users, invites]) => {
        setRows(users);
        setPendingInvites(invites);
        setError('');
      })
      .catch(e => {
        setError(String(e instanceof Error ? e.message : e));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (typeof window !== 'undefined' && window.location.search.includes('accepted=1')) {
      setAccepted(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('accepted');
      window.history.replaceState({}, '', url.toString());
      setTimeout(() => setAccepted(false), 5000);
    }
  }, []);

  const filteredRows = useMemo(
    () => filter === 'todos' ? rows : rows.filter(r => r.role === filter),
    [rows, filter],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: rows.length };
    for (const r of rows) c[r.role] = (c[r.role] ?? 0) + 1;
    return c;
  }, [rows]);

  const activeCount = rows.filter(r => r.acceptedAt).length;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const d = await res.json().catch(() => ({})) as { error?: string; inviteUrl?: string; email?: string; role?: string };
      if (!res.ok) {
        alert(`Erro: ${d.error ?? res.status}`);
        return;
      }
      if (d.inviteUrl) {
        setIssuedInvite({
          email: d.email ?? email,
          role: d.role ?? role,
          url: buildAbsoluteUrl(d.inviteUrl),
        });
      }
      setEmail('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      alert('URL copiada!');
    } catch {
      alert(`Copie manualmente: ${url}`);
    }
  }

  async function revokeInvite(id: string, inviteEmail: string) {
    if (!confirm(`Revogar convite de ${inviteEmail}?`)) return;
    const res = await fetch(`/api/users/invites?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      alert(`Erro: ${d.error ?? res.status}`);
      return;
    }
    load();
  }

  async function changeRole(id: string, newRole: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      alert(`Erro: ${d.error ?? res.status}`);
      return;
    }
    load();
  }

  async function removeUser(id: string, email: string) {
    if (!confirm(`Remover acesso de ${email}?`)) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      alert(`Erro: ${d.error ?? res.status}`);
      return;
    }
    load();
  }

  const filterChips: Array<[string, string]> = [
    ['todos', 'Todos'],
    ...ROLES.map(r => [r.v, r.label] as [string, string]),
  ];

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Usuários e papéis</h1>
          <p className="body-s mt-1">
            {rows.length} {rows.length === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}
            {' · '}
            <span style={{ color: 'var(--success)' }}>{activeCount} {activeCount === 1 ? 'ativa' : 'ativas'}</span>
            {pendingInvites.length > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--warning)' }}>{pendingInvites.length} {pendingInvites.length === 1 ? 'convite pendente' : 'convites pendentes'}</span>
              </>
            )}
          </p>
        </div>
      </header>

      {accepted && (
        <div className="rounded p-3 body-s" style={{ background: 'var(--success-soft)', border: '1px solid var(--border)', color: 'var(--success)' }}>
          Convite aceito com sucesso. Bem-vindo(a)!
        </div>
      )}

      {issuedInvite && (
        <div className="rounded p-4 space-y-2" style={{ background: 'var(--info-soft)', border: '1px solid var(--border)' }}>
          <div className="body-s font-semibold" style={{ color: 'var(--accent)' }}>
            Convite criado para <span className="mono">{issuedInvite.email}</span> ({ROLE_LABEL[issuedInvite.role] ?? issuedInvite.role})
          </div>
          <p className="caption" style={{ color: 'var(--accent)' }}>
            Copie e envie a URL abaixo para a pessoa convidada. O convite vale por 7 dias.
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              readOnly
              value={issuedInvite.url}
              className="lj-input flex-1 caption mono"
              onFocus={e => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => copyInviteUrl(issuedInvite.url)}
              className="lj-btn-primary caption"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => setIssuedInvite(null)}
              className="caption px-2 py-1 hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Convidar pessoa */}
      <form onSubmit={handleInvite} className="lj-card p-5">
        <h2 className="body-s font-semibold mb-3">Convidar pessoa</h2>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block caption mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="pessoa@empresa.com"
              className="lj-input w-full"
            />
          </div>
          <div>
            <label className="block caption mb-1">
              Papel
              <InfoTooltip text="Owner = todas permissões. Admin = todas exceto billing. Operador = pedidos+atendimento. Editor = produtos+UGC. Atendimento = só tickets+chatbot. Financeiro = pedidos+relatórios." />
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="lj-input"
            >
              {ROLES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="lj-btn-primary"
          >
            {saving ? 'Enviando...' : '+ Convidar por e-mail'}
          </button>
        </div>
        <p className="caption mt-3">{ROLES.find(r => r.v === role)?.desc}</p>
      </form>

      {/* Filter chips */}
      {rows.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="caption" style={{ fontWeight: 500 }}>Filtrar:</span>
          {filterChips.map(([id, label]) => {
            const isActive = filter === id;
            const n = counts[id] ?? 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className="caption"
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)'),
                  background: isActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  color: isActive ? 'var(--accent)' : 'var(--fg-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {label}<span style={{ opacity: 0.6, marginLeft: 4 }}>· {n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Convites pendentes */}
      {pendingInvites.length > 0 && (
        <section className="lj-card p-5">
          <h2 className="body-s font-semibold mb-3">
            Convites pendentes
            <InfoTooltip text="Convites criados ainda não aceitos. Cada convite vale 7 dias. Compartilhe a URL manualmente — o aceite ocorre automaticamente quando o convidado fizer login com o email convidado." />
          </h2>
          <table className="w-full text-sm">
            <thead className="eyebrow">
              <tr>
                <th className="text-left pb-2">Email</th>
                <th className="text-left pb-2">Papel</th>
                <th className="text-left pb-2">Expira em</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map(inv => (
                <tr key={inv.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-2">{inv.email}</td>
                  <td className="py-2"><RoleBadge role={inv.role} label={ROLE_LABEL[inv.role] ?? inv.role} /></td>
                  <td className="py-2 caption">
                    {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => copyInviteUrl(buildAbsoluteUrl(inv.inviteUrl))}
                      className="caption hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      Copiar URL
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeInvite(inv.id, inv.email)}
                      className="caption hover:underline"
                      style={{ color: 'var(--error)' }}
                    >
                      Revogar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Lista membros */}
      {loading ? (
        <p className="body-s">Carregando...</p>
      ) : error ? (
        <div className="rounded p-3 body-s" style={{ background: 'var(--warning-soft)', border: '1px solid var(--border)', color: 'var(--warning)' }}>{error}</div>
      ) : rows.length === 0 ? (
        <p className="body-s">Nenhum usuário cadastrado ainda.</p>
      ) : filteredRows.length === 0 ? (
        <p className="body-s">Nenhum membro com este filtro.</p>
      ) : (
        <div className="lj-card overflow-hidden" style={{ padding: 0 }}>
          <table className="w-full text-sm">
            <thead className="eyebrow" style={{ background: 'var(--bg-subtle)' }}>
              <tr>
                <th className="text-left px-4 py-2">Membro</th>
                <th className="text-left px-4 py-2">Papel</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Convidado em</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-2">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        aria-hidden
                        style={{
                          width: 32, height: 32, borderRadius: 'var(--radius-full)',
                          background: gradientFor(u.email),
                          color: '#fff',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: 0,
                        }}
                      >
                        {initialsFor(u.email)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{u.email.split('@')[0]}</div>
                        <div className="caption" style={{ marginTop: 2 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="lj-input caption"
                      aria-label={`Alterar papel de ${u.email}`}
                    >
                      {ROLES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 caption">
                    {u.acceptedAt ? (
                      <span className="lj-badge lj-badge-success">Ativo</span>
                    ) : (
                      <span className="lj-badge lj-badge-warning">Aguardando login</span>
                    )}
                  </td>
                  <td className="px-4 py-2 caption">
                    {new Date(u.invitedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => removeUser(u.id, u.email)}
                      className="caption hover:underline"
                      style={{ color: 'var(--error)' }}
                    >
                      Revogar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Funções disponíveis */}
      <RoleCards />

      {/* Audit preview (últimas 10 ações) */}
      <AuditPreview />
    </div>
  );
}
