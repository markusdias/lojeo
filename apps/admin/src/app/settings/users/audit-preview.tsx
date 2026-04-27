'use client';

import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  userEmail: string | null;
  createdAt: string;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.round(h / 24);
  if (days < 30) return `há ${days} dia${days === 1 ? '' : 's'}`;
  return d.toLocaleDateString('pt-BR');
}

export function AuditPreview() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/audit?limit=10&days=30')
      .then(async r => {
        const d = await r.json() as { logs?: AuditLog[]; error?: string };
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
        return d.logs ?? [];
      })
      .then(rows => {
        if (!cancelled) setLogs(rows);
      })
      .catch(e => {
        if (!cancelled) setError(String(e instanceof Error ? e.message : e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="lj-card p-5">
        <h2 className="body-s font-semibold mb-3">Atividade recente</h2>
        <p className="caption">Carregando...</p>
      </section>
    );
  }

  if (error) {
    // Permissão pode estar negada (403). Esconder em vez de mostrar erro técnico.
    return null;
  }

  return (
    <section className="lj-card p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="body-s font-semibold m-0">
          Atividade recente
          <span className="caption" style={{ marginLeft: 8, fontWeight: 400 }}>· últimas 10 ações</span>
        </h2>
        <a
          href="/settings/audit"
          className="caption hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Ver log completo &rarr;
        </a>
      </div>
      {logs.length === 0 ? (
        <p className="caption">Nenhuma ação registrada ainda.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {logs.map((l, idx) => (
            <li
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="body-s" style={{ color: 'var(--fg)', fontWeight: 500 }}>
                  {l.action}
                  {l.entityType && (
                    <span className="caption" style={{ marginLeft: 6, fontWeight: 400 }}>
                      · {l.entityType}
                    </span>
                  )}
                </div>
                {l.userEmail && (
                  <div className="caption" style={{ marginTop: 2 }}>{l.userEmail}</div>
                )}
              </div>
              <span className="caption" style={{ whiteSpace: 'nowrap' }}>
                {formatRelative(l.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
