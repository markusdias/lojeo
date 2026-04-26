'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '../../../components/ui/metric-card';

interface SourceStats {
  source: string;
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface CtrPayload {
  days: number;
  since: string;
  sources: SourceStats[];
  total: { impressions: number; clicks: number; ctr: number };
  error?: string;
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

export default function RecomendacoesCtrPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CtrPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/recommendations/ctr?days=${days}`)
      .then(async r => {
        const d = (await r.json()) as CtrPayload;
        if (!r.ok) {
          setError(d.error ?? `HTTP ${r.status}`);
          setData(null);
        } else {
          setData(d);
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>
          CTR de recomendações
        </h1>
        <p className="body-s">
          Click-through-rate por fonte de recomendação. Mede impressão (componente em viewport) vs clique no produto sugerido.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={d === days ? 'lj-btn-primary' : 'lj-btn-secondary'}
            type="button"
          >
            {d} dias
          </button>
        ))}
      </div>

      {loading && <p className="body-s">Carregando…</p>}
      {error && (
        <div className="lj-card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <p className="body-s" style={{ color: 'var(--error)' }}>Erro: {error}</p>
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <MetricCard label="Impressões" value={fmtNum(data.total.impressions)} />
            <MetricCard label="Cliques" value={fmtNum(data.total.clicks)} />
            <MetricCard label="CTR Total" value={fmtPct(data.total.ctr)} accent />
          </div>

          <div className="lj-card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Fonte</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Impressões</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Cliques</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>CTR</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map(s => {
                  const variant =
                    s.impressions === 0 ? 'lj-badge lj-badge-neutral' :
                    s.ctr >= 0.05 ? 'lj-badge lj-badge-success' :
                    s.ctr >= 0.02 ? 'lj-badge lj-badge-info' :
                    'lj-badge lj-badge-warning';
                  const status =
                    s.impressions === 0 ? 'Sem dados' :
                    s.ctr >= 0.05 ? 'Alto' :
                    s.ctr >= 0.02 ? 'Médio' : 'Baixo';
                  return (
                    <tr key={s.source} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{s.label}</td>
                      <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{fmtNum(s.impressions)}</td>
                      <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{fmtNum(s.clicks)}</td>
                      <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 'var(--w-medium)' }}>{fmtPct(s.ctr)}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        <span className={variant}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="caption" style={{ marginTop: 'var(--space-3)' }}>
            Período: últimos {data.days} dias · desde {new Date(data.since).toLocaleDateString('pt-BR')}
          </p>
          <p className="caption" style={{ marginTop: 'var(--space-1)' }}>
            Benchmarks: alto ≥ 5% · médio ≥ 2% · baixo &lt; 2%
          </p>
        </>
      )}
    </div>
  );
}
