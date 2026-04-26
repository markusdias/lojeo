'use client';

import { useEffect, useState } from 'react';

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
    <div className="p-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">CTR de recomendações</h1>
        <p className="text-sm text-gray-500">
          Click-through-rate por fonte de recomendação. Mede impressão (componente entrou em viewport) vs clique no produto sugerido.
        </p>
      </header>

      <div className="flex gap-2 mb-6">
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={d === days ? 'lj-btn-primary' : 'lj-btn-secondary'}
          >
            {d} dias
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Carregando…</p>}
      {error && (
        <div className="lj-card p-4 mb-6">
          <p className="text-sm" style={{ color: 'var(--error)' }}>Erro: {error}</p>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="lj-card p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Impressões</p>
              <p className="text-2xl font-semibold">{fmtNum(data.total.impressions)}</p>
            </div>
            <div className="lj-card p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Cliques</p>
              <p className="text-2xl font-semibold">{fmtNum(data.total.clicks)}</p>
            </div>
            <div className="lj-card p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">CTR Total</p>
              <p className="text-2xl font-semibold">{fmtPct(data.total.ctr)}</p>
            </div>
          </div>

          <div className="lj-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left p-3 font-medium">Fonte</th>
                  <th className="text-right p-3 font-medium">Impressões</th>
                  <th className="text-right p-3 font-medium">Cliques</th>
                  <th className="text-right p-3 font-medium">CTR</th>
                  <th className="text-right p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map(s => {
                  const variant =
                    s.ctr >= 0.05 ? 'lj-badge lj-badge-success' :
                    s.ctr >= 0.02 ? 'lj-badge lj-badge-info' :
                    s.impressions === 0 ? 'lj-badge lj-badge-neutral' :
                    'lj-badge lj-badge-warning';
                  const status =
                    s.impressions === 0 ? 'Sem dados' :
                    s.ctr >= 0.05 ? 'Alto' :
                    s.ctr >= 0.02 ? 'Médio' : 'Baixo';
                  return (
                    <tr key={s.source} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="p-3">{s.label}</td>
                      <td className="p-3 text-right">{fmtNum(s.impressions)}</td>
                      <td className="p-3 text-right">{fmtNum(s.clicks)}</td>
                      <td className="p-3 text-right font-medium">{fmtPct(s.ctr)}</td>
                      <td className="p-3 text-right">
                        <span className={variant}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Período: últimos {data.days} dias · desde {new Date(data.since).toLocaleDateString('pt-BR')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Benchmarks: alto ≥ 5% · médio ≥ 2% · baixo &lt; 2%
          </p>
        </>
      )}
    </div>
  );
}
