'use client';

import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_GROUPS: Array<{ label: string; prefix: string }> = [
  { label: 'Pedidos', prefix: 'order.' },
  { label: 'Tickets', prefix: 'ticket.' },
  { label: 'UGC', prefix: 'ugc.' },
  { label: 'Roles', prefix: 'role.' },
  { label: 'Configurações', prefix: 'settings.' },
  { label: 'Produtos', prefix: 'product.' },
];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [actionFilter, setActionFilter] = useState('');

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({ days: String(days) });
    if (actionFilter) qs.set('action', actionFilter);
    fetch(`/api/audit?${qs}`)
      .then(async r => {
        const d = await r.json() as { logs?: AuditLog[]; error?: string };
        if (!r.ok) {
          setError(d.error ?? `HTTP ${r.status}`);
          setLogs([]);
        } else {
          setLogs(d.logs ?? []);
          setError('');
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [days, actionFilter]);

  return (
    <div className="p-8 max-w-5xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Logs de auditoria</h1>
        <p className="body-s mt-1">Quem fez o quê, quando e em qual entidade.</p>
      </header>

      {/* Filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="lj-input"
        >
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
          <option value="90">90 dias</option>
        </select>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="lj-input"
        >
          <option value="">Todas as ações</option>
          {ACTION_GROUPS.map(g => (
            <option key={g.prefix} value={g.prefix.slice(0, -1)}>{g.label} (filtro grupo)</option>
          ))}
        </select>
        {actionFilter && (
          <span className="caption">
            Filtrando por <code>{actionFilter}*</code>
          </span>
        )}
        <span className="caption">{logs.length} registros</span>
      </div>

      {loading ? (
        <p className="body-s">Carregando...</p>
      ) : error ? (
        <div className="rounded p-3 body-s" style={{ background: 'var(--warning-soft)', border: '1px solid var(--border)', color: 'var(--warning)' }}>{error}</div>
      ) : logs.length === 0 ? (
        <p className="body-s">Nenhum log encontrado para os filtros atuais.</p>
      ) : (
        <div className="lj-card" style={{ padding: 0 }}>
          {logs.map(l => (
            <div key={l.id} className="p-4 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <code className="font-medium caption mono px-2 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'var(--info-soft)' }}>{l.action}</code>
                  {l.entityType && (
                    <span className="caption ml-2">{l.entityType}{l.entityId ? `:${l.entityId.slice(0, 8)}` : ''}</span>
                  )}
                </div>
                <div className="caption">
                  {new Date(l.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>
              <p className="caption mt-1">
                {l.userEmail ?? <span className="italic">sistema</span>}
                {l.ipAddress && <span className="ml-2" style={{ color: 'var(--fg-muted)' }}>{l.ipAddress}</span>}
              </p>
              {(Boolean(l.before) || Boolean(l.after)) && (
                <details className="mt-2">
                  <summary className="caption cursor-pointer" style={{ color: 'var(--accent)' }}>Detalhes</summary>
                  <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                    <div>
                      <p className="caption mb-1">Antes</p>
                      <pre className="rounded p-2 overflow-x-auto text-[11px]" style={{ background: 'var(--bg-subtle)' }}>
                        {l.before ? JSON.stringify(l.before, null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <p className="caption mb-1">Depois</p>
                      <pre className="rounded p-2 overflow-x-auto text-[11px]" style={{ background: 'var(--bg-subtle)' }}>
                        {l.after ? JSON.stringify(l.after, null, 2) : '—'}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
