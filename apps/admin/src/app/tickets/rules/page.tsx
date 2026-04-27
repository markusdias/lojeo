'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface Rule {
  id: string;
  name: string;
  ruleType: 'keyword' | 'round_robin';
  keyword: string | null;
  targetUserId: string | null;
  priority: number;
  active: boolean;
  metadata: { userIds?: string[] } | null;
  createdAt: string;
}

interface User {
  id: string;
  userId: string;
  email: string;
  role: string;
}

const ASSIGNABLE_ROLES = ['owner', 'admin', 'operador', 'atendimento'];

export default function TicketRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState<'keyword' | 'round_robin'>('keyword');
  const [keyword, setKeyword] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [priority, setPriority] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/tickets/rules'),
        fetch('/api/users'),
      ]);
      const d1 = await r1.json();
      const d2 = r2.ok ? await r2.json() : { users: [] };
      setRules(d1.rules ?? []);
      setUsers(d2.users ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const assignableUsers = useMemo(
    () => users.filter((u) => ASSIGNABLE_ROLES.includes(u.role)),
    [users],
  );

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of users) m.set(u.userId, u);
    return m;
  }, [users]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        ruleType,
        priority,
        active: true,
      };
      if (ruleType === 'keyword') {
        payload.keyword = keyword.trim();
        payload.targetUserId = targetUserId || null;
      } else {
        payload.userIds = userIds;
      }
      const r = await fetch('/api/tickets/rules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(JSON.stringify(j));
      }
      setName(''); setKeyword(''); setTargetUserId(''); setUserIds([]); setPriority(100);
      setRuleType('keyword');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(rule: Rule) {
    try {
      const r = await fetch(`/api/tickets/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: !rule.active }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta regra?')) return;
    try {
      const r = await fetch(`/api/tickets/rules/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Regras de atribuição</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-secondary)', margin: '4px 0 0' }}>
            Defina como tickets recém-criados são distribuídos automaticamente para a equipe.
          </p>
        </div>
        <Link href="/tickets" className="lj-btn-secondary" style={{ textDecoration: 'none' }}>
          ← Tickets
        </Link>
      </div>

      {/* Form */}
      <form
        onSubmit={handleCreate}
        className="lj-card"
        style={{ padding: 16, marginBottom: 24, display: 'grid', gap: 12 }}
        aria-label="Criar nova regra"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
          <div>
            <label htmlFor="rule-name" style={{ fontSize: 11, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>
              Nome da regra
            </label>
            <input
              id="rule-name"
              className="lj-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Atendimento de logística"
              required
            />
          </div>
          <div>
            <label htmlFor="rule-type" style={{ fontSize: 11, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>
              Tipo
            </label>
            <select
              id="rule-type"
              className="lj-input"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as 'keyword' | 'round_robin')}
            >
              <option value="keyword">Por palavra-chave</option>
              <option value="round_robin">Rodízio (round-robin)</option>
            </select>
          </div>
          <div>
            <label htmlFor="rule-priority" style={{ fontSize: 11, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>
              Prioridade
            </label>
            <input
              id="rule-priority"
              className="lj-input"
              type="number"
              min={0}
              max={1000}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) || 100)}
              aria-describedby="rule-priority-help"
            />
            <small id="rule-priority-help" style={{ fontSize: 10, color: 'var(--fg-muted)' }}>menor = mais alta</small>
          </div>
        </div>

        {ruleType === 'keyword' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="rule-keyword" style={{ fontSize: 11, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>
                Palavra-chave (busca em assunto/corpo, case-insensitive)
              </label>
              <input
                id="rule-keyword"
                className="lj-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ex: entrega, reembolso, NF-e"
              />
            </div>
            <div>
              <label htmlFor="rule-target" style={{ fontSize: 11, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>
                Atribuir para
              </label>
              <select
                id="rule-target"
                className="lj-input"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                required
              >
                <option value="">— selecionar —</option>
                {assignableUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>{u.email} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {ruleType === 'round_robin' && (
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>
              Membros do rodízio
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {assignableUsers.map((u) => {
                const checked = userIds.includes(u.userId);
                return (
                  <label key={u.userId} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 999,
                    border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'var(--accent-soft)' : 'transparent',
                    color: checked ? 'var(--accent)' : 'var(--fg-secondary)',
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setUserIds((prev) => prev.includes(u.userId)
                          ? prev.filter((x) => x !== u.userId)
                          : [...prev, u.userId]);
                      }}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {u.email}
                  </label>
                );
              })}
              {assignableUsers.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  Nenhum membro com papel atribuível ainda. Adicione em /settings/users.
                </span>
              )}
            </div>
          </div>
        )}

        <div>
          <button type="submit" className="lj-btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Adicionar regra'}
          </button>
        </div>
      </form>

      {error && (
        <div className="lj-card" style={{ padding: 12, marginBottom: 16, borderColor: 'var(--error)', color: 'var(--error)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="lj-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, fontSize: 11, color: 'var(--fg-secondary)' }}>Prio.</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, fontSize: 11, color: 'var(--fg-secondary)' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, fontSize: 11, color: 'var(--fg-secondary)' }}>Tipo</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, fontSize: 11, color: 'var(--fg-secondary)' }}>Critério</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, fontSize: 11, color: 'var(--fg-secondary)' }}>Destino</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, fontSize: 11, color: 'var(--fg-secondary)' }}>Ativa</th>
              <th style={{ padding: '10px 14px' }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: 16, color: 'var(--fg-secondary)' }}>Carregando…</td></tr>
            )}
            {!loading && rules.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 16, color: 'var(--fg-secondary)' }}>Nenhuma regra cadastrada.</td></tr>
            )}
            {!loading && rules.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>{r.priority}</td>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span className={r.ruleType === 'keyword' ? 'lj-badge lj-badge-info' : 'lj-badge lj-badge-accent'}>
                    {r.ruleType === 'keyword' ? 'Palavra-chave' : 'Rodízio'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--fg-secondary)' }}>
                  {r.ruleType === 'keyword' ? `"${r.keyword ?? ''}"` : `${r.metadata?.userIds?.length ?? 0} membros`}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--fg-secondary)' }}>
                  {r.ruleType === 'keyword'
                    ? (r.targetUserId ? userById.get(r.targetUserId)?.email ?? r.targetUserId.slice(0, 8) : '—')
                    : (r.metadata?.userIds?.map((uid) => userById.get(uid)?.email?.split('@')[0] ?? uid.slice(0, 6)).join(', ') ?? '—')}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <button
                    type="button"
                    onClick={() => toggleActive(r)}
                    aria-label={r.active ? 'Desativar regra' : 'Ativar regra'}
                    style={{
                      width: 36, height: 20, borderRadius: 999, border: 'none',
                      background: r.active ? 'var(--accent)' : 'var(--neutral-200)',
                      position: 'relative', cursor: 'pointer',
                      transition: 'background 140ms var(--ease-out)',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: r.active ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 140ms var(--ease-out)',
                    }} />
                  </button>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="lj-btn-secondary"
                    style={{ fontSize: 11, padding: '3px 10px', color: 'var(--error)' }}
                    onClick={() => handleDelete(r.id)}
                    aria-label={`Remover ${r.name}`}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
