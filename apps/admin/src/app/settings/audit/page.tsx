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
        <p className="text-sm text-gray-500 mt-1">Quem fez o quê, quando e em qual entidade.</p>
      </header>

      {/* Filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
          <option value="90">90 dias</option>
        </select>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">Todas as ações</option>
          {ACTION_GROUPS.map(g => (
            <option key={g.prefix} value={g.prefix.slice(0, -1)}>{g.label} (filtro grupo)</option>
          ))}
        </select>
        {actionFilter && (
          <span className="text-xs text-gray-400">
            Filtrando por <code>{actionFilter}*</code>
          </span>
        )}
        <span className="text-xs text-gray-500">{logs.length} registros</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">{error}</div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum log encontrado para os filtros atuais.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {logs.map(l => (
            <div key={l.id} className="p-4 text-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <code className="text-indigo-700 font-medium text-xs bg-indigo-50 px-2 py-0.5 rounded">{l.action}</code>
                  {l.entityType && (
                    <span className="text-xs text-gray-500 ml-2">{l.entityType}{l.entityId ? `:${l.entityId.slice(0, 8)}` : ''}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(l.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {l.userEmail ?? <span className="italic">sistema</span>}
                {l.ipAddress && <span className="ml-2 text-gray-400">{l.ipAddress}</span>}
              </p>
              {(Boolean(l.before) || Boolean(l.after)) && (
                <details className="mt-2">
                  <summary className="text-xs text-indigo-600 cursor-pointer">Detalhes</summary>
                  <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                    <div>
                      <p className="text-gray-500 mb-1">Antes</p>
                      <pre className="bg-gray-50 rounded p-2 overflow-x-auto text-[11px]">
                        {l.before ? JSON.stringify(l.before, null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Depois</p>
                      <pre className="bg-gray-50 rounded p-2 overflow-x-auto text-[11px]">
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
