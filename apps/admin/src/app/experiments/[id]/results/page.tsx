'use client';

import { useEffect, useState, use } from 'react';

interface VariantStats {
  variantKey: string;
  variantName: string;
  weight: number;
  exposures: number;
  conversions: number;
  conversionRate: number;
  liftVsControl: number;
}

interface DailyPoint {
  day: string;
  variantKey: string;
  exposures: number;
  conversions: number;
}

interface ResultsResponse {
  experiment: {
    id: string;
    key: string;
    name: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    targetMetric: string;
  };
  variants: VariantStats[];
  daily: DailyPoint[];
  summary: {
    totalExposures: number;
    totalConversions: number;
    overallRate: number;
    significantSampleSize: boolean;
  };
}

export default function ExperimentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/experiments/${id}/results`)
      .then(async r => {
        const d = await r.json() as ResultsResponse & { error?: string };
        if (!r.ok) setError(d.error ?? `HTTP ${r.status}`);
        else setData(d);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-sm" style={{ color: 'var(--fg-secondary)' }}>Carregando...</div>;
  if (error || !data) return <div className="p-8 text-sm" style={{ color: 'var(--error)' }}>Erro: {error}</div>;

  const { experiment: exp, variants, summary } = data;
  const winner = variants.length > 1
    ? variants.reduce((best, v) => v.conversionRate > best.conversionRate ? v : best)
    : null;

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <a href="/experiments" className="text-xs" style={{ color: 'var(--fg-secondary)' }}>← Experimentos</a>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginTop: 'var(--space-1)' }}>
            Resultados: {exp.name}
          </h1>
          <p className="mono caption">{exp.key}</p>
        </div>
        <span className="lj-badge lj-badge-accent" style={{ padding: '4px 10px' }}>
          {exp.status}
        </span>
      </header>

      <div className="lj-ai-banner">
        <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
        <div>
          <p className="lj-ai-eyebrow">IA · ANÁLISE ESTATÍSTICA</p>
          <p className="body-s" style={{ color: 'var(--fg)', marginTop: 4 }}>
            {!summary.significantSampleSize
              ? `Amostra de ${summary.totalExposures.toLocaleString('pt-BR')} exposições é insuficiente — recomenda-se ≥1.000 por variante para inferência confiável. Continue rodando ou amplie tráfego.`
              : winner && variants.length > 1 && winner.conversionRate > variants.reduce((m, v) => v !== winner && v.conversionRate > m ? v.conversionRate : m, 0) * 1.1
                ? `Variante ${winner.variantKey} lidera com ${(winner.conversionRate * 100).toFixed(2)}% de conversão · lift de ${winner.liftVsControl >= 0 ? '+' : ''}${winner.liftVsControl.toFixed(1)}% sobre controle. Sample size suficiente — considere declarar vencedor.`
                : `Diferença entre variantes não atinge significância prática (>10%). Considere ampliar amostra ou ajustar variações.`}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Exposições</p>
          <p className="numeric" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>
            {summary.totalExposures.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Conversões</p>
          <p className="numeric" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>
            {summary.totalConversions.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Taxa geral</p>
          <p className="numeric" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', color: 'var(--accent)' }}>
            {(summary.overallRate * 100).toFixed(2)}%
          </p>
        </div>
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Sample size</p>
          <p className="body-s" style={{ marginTop: 4, fontWeight: 'var(--w-medium)', color: summary.significantSampleSize ? 'var(--success)' : 'var(--warning)' }}>
            {summary.significantSampleSize ? '✓ Significante' : '⚠ Insuficiente (<1k)'}
          </p>
        </div>
      </div>

      {/* Variants comparison */}
      <section className="lj-card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--fg-secondary)' }}>Performance por variante</h2>
        <div className="space-y-3">
          {variants.map((v, i) => {
            const isControl = i === 0;
            const isWinner = winner?.variantKey === v.variantKey && summary.significantSampleSize;
            const rateW = variants[0] ? Math.max(...variants.map(x => x.conversionRate), 0.001) : 0.001;
            const widthPct = (v.conversionRate / rateW) * 100;
            return (
              <div key={v.variantKey} className="border rounded p-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <code className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{v.variantKey}</code>
                    <span className="font-medium">{v.variantName}</span>
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{v.weight}%</span>
                    {isControl && <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>(controle)</span>}
                    {isWinner && <span className="lj-badge lj-badge-success">🏆 Vencedor</span>}
                  </div>
                  <div className="text-sm">
                    <strong>{(v.conversionRate * 100).toFixed(2)}%</strong>
                    {!isControl && (
                      <span className="ml-2 text-xs" style={{ color: v.liftVsControl > 0 ? 'var(--success)' : v.liftVsControl < 0 ? 'var(--error)' : 'var(--fg-muted)' }}>
                        {v.liftVsControl >= 0 ? '+' : ''}{v.liftVsControl.toFixed(1)}% vs controle
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded overflow-hidden" style={{ background: 'var(--neutral-50)' }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${widthPct}%`,
                      background: isWinner ? 'var(--success)' : 'var(--accent)',
                    }}
                  />
                </div>
                <div className="mt-2 text-xs flex gap-4" style={{ color: 'var(--fg-secondary)' }}>
                  <span>{v.exposures.toLocaleString('pt-BR')} exposições</span>
                  <span>{v.conversions.toLocaleString('pt-BR')} conversões</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!summary.significantSampleSize && (
        <div className="rounded p-4 text-sm" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
          ⚠ Mantenha experimento ativo até cada variante ter pelo menos 1.000 exposições para conclusão estatisticamente significativa.
        </div>
      )}
    </div>
  );
}
