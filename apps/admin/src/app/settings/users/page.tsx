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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('atendimento');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch('/api/users')
      .then(async r => {
        const d = await r.json() as { users?: UserRoleRow[]; error?: string };
        if (!r.ok) {
          setError(d.error ?? `HTTP ${r.status}`);
          setRows([]);
        } else {
          setRows(d.users ?? []);
          setError('');
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        alert(`Erro: ${d.error ?? res.status}`);
        return;
      }
      setEmail('');
      load();
    } finally {
      setSaving(false);
    }
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
