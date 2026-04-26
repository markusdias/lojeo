'use client';

import { useEffect, useState } from 'react';
import { InfoTooltip } from '@/components/ui/info-tooltip';

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
    // Mostrar toast de "convite aceito" se vier do redirect
    if (typeof window !== 'undefined' && window.location.search.includes('accepted=1')) {
      setAccepted(true);
      // Limpa querystring sem reload
      const url = new URL(window.location.href);
      url.searchParams.delete('accepted');
      window.history.replaceState({}, '', url.toString());
      setTimeout(() => setAccepted(false), 5000);
    }
  }, []);

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

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Usuários e papéis</h1>
        <p className="text-sm text-gray-500 mt-1">Quem pode acessar este admin e o que cada um pode fazer.</p>
      </header>

      {accepted && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-900">
          Convite aceito com sucesso. Bem-vindo(a)!
        </div>
      )}

      {issuedInvite && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
          <div className="text-sm font-semibold text-blue-900">
            Convite criado para <span className="font-mono">{issuedInvite.email}</span> ({issuedInvite.role})
          </div>
          <p className="text-xs text-blue-800">
            Copie e envie a URL abaixo para a pessoa convidada. O convite vale por 7 dias.
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              readOnly
              value={issuedInvite.url}
              className="flex-1 border border-blue-300 rounded px-2 py-1 text-xs font-mono bg-white"
              onFocus={e => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => copyInviteUrl(issuedInvite.url)}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => setIssuedInvite(null)}
              className="text-xs px-2 py-1 text-blue-700 hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Invite form */}
      <form onSubmit={handleInvite} className="lj-card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Convidar pessoa</h2>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs text-gray-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="pessoa@empresa.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Papel
              <InfoTooltip text="Owner = todas permissões. Admin = todas exceto billing. Operador = pedidos+atendimento. Editor = produtos+UGC. Atendimento = só tickets+chatbot. Financeiro = pedidos+relatórios." />
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {ROLES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="lj-btn-primary"
          >
            {saving ? 'Enviando...' : 'Convidar'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">{ROLES.find(r => r.v === role)?.desc}</p>
      </form>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section className="lj-card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Convites pendentes
            <InfoTooltip text="Convites criados ainda não aceitos. Cada convite vale 7 dias. Compartilhe a URL manualmente — o aceite ocorre automaticamente quando o convidado fizer login com o email convidado." />
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left pb-2">Email</th>
                <th className="text-left pb-2">Papel</th>
                <th className="text-left pb-2">Expira em</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map(inv => (
                <tr key={inv.id} className="border-t border-gray-100">
                  <td className="py-2">{inv.email}</td>
                  <td className="py-2 text-xs">{ROLE_LABEL[inv.role] ?? inv.role}</td>
                  <td className="py-2 text-xs text-gray-500">
                    {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => copyInviteUrl(buildAbsoluteUrl(inv.inviteUrl))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Copiar URL
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeInvite(inv.id, inv.email)}
                      className="text-xs text-red-500 hover:underline"
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

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">{error}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum usuário cadastrado ainda.</p>
      ) : (
        <div className="lj-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Papel</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Convidado em</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      {ROLES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {u.acceptedAt ? (
                      <span className="text-green-700">Ativo</span>
                    ) : (
                      <span className="text-amber-700">Aguardando login</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(u.invitedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => removeUser(u.id, u.email)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
