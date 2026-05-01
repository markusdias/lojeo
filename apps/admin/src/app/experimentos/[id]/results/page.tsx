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
  pValue: number;
  confidencePct: number;
  isSignificant: boolean;
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

  const { experiment: exp, variants, daily, summary } = data;
  const winner = variants.length > 1
    ? variants.reduce((best, v) => v.conversionRate > best.conversionRate ? v : best)
    : null;

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <a href="/experimentos" className="text-xs" style={{ color: 'var(--fg-secondary)' }}>← Experimentos</a>
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

      {/* Confidence gauge real (z-test 2-prop) — match ABEditor.jsx */}
      <ConfidenceCard
        confidence={winner && winner.variantKey !== variants[0]?.variantKey ? winner.confidencePct : 50}
        pValue={winner && winner.variantKey !== variants[0]?.variantKey ? winner.pValue : 1}
        lift={winner?.liftVsControl ?? 0}
        sampleSize={summary.totalExposures}
        isSignificant={winner?.isSignificant ?? false}
      />

      {/* Daily sparkline A vs B — paridade ABEditor.jsx ABDailyChart */}
      <DailyChartCard daily={daily} variants={variants} />

      {/* Cuidados antes de declarar vencedor — match ABEditor.jsx */}
      <CautionsCard
        sampleSize={summary.totalExposures}
        lift={winner?.liftVsControl ?? 0}
        days={Math.max(1, Math.floor((Date.now() - new Date(exp.startedAt ?? Date.now()).getTime()) / (24 * 60 * 60 * 1000)))}
      />

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

// ─── ConfidenceCard: gauge semicírculo + p-valor + lift + power ─────────────
function ConfidenceCard({
  confidence,
  pValue,
  lift,
  sampleSize,
  isSignificant,
}: {
  confidence: number;
  pValue: number;
  lift: number;
  sampleSize: number;
  isSignificant: boolean;
}) {
  const r = 70;
  const c = Math.PI * r;
  const offset = c - (confidence / 100) * c;
  const color = confidence >= 95 ? 'var(--success)' : confidence >= 85 ? 'var(--warning)' : 'var(--error)';
  const power = sampleSize >= 5000 ? 0.85 : sampleSize >= 2000 ? 0.7 : sampleSize >= 1000 ? 0.55 : 0.35;
  const stdErr = sampleSize > 1000 ? 0.42 : 0.84;

  return (
    <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-4)' }}>Confiança estatística</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-6)', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 180, height: 110 }}>
          <svg width="180" height="100" viewBox="0 0 180 100">
            <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--neutral-100)" strokeWidth="10" strokeLinecap="round" />
            <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
            <line x1="153" y1="56" x2="158" y2="50" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', top: 32, left: 0, right: 0, textAlign: 'center' }}>
            <div className="numeric" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', color, lineHeight: 1 }}>
              {confidence.toFixed(1)}%
            </div>
            <div className="caption" style={{ marginTop: 4 }}>de confiança</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>P-valor</p>
            <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)' }}>{pValue.toFixed(3)}</p>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Lift relativo</p>
            <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)', color: lift > 0 ? 'var(--success)' : 'var(--error)' }}>
              {lift >= 0 ? '+' : ''}{lift.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Erro padrão</p>
            <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)' }}>±{stdErr.toFixed(2)}pp</p>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Power</p>
            <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)' }}>{power.toFixed(2)}</p>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
        {isSignificant && lift > 0 && (
          <span className="body-s" style={{ color: 'var(--success)', fontWeight: 'var(--w-medium)' }}>
            ✓ Diferença estatisticamente significativa (p={pValue.toFixed(3)} &lt; 0.05) — pode declarar vencedor
          </span>
        )}
        {isSignificant && lift < 0 && (
          <span className="body-s" style={{ color: 'var(--error)', fontWeight: 'var(--w-medium)' }}>
            ⚠ Variante teste é significativamente PIOR (p={pValue.toFixed(3)}) — encerre e mantenha controle
          </span>
        )}
        {!isSignificant && confidence >= 85 && (
          <span className="body-s" style={{ color: 'var(--warning)', fontWeight: 'var(--w-medium)' }}>
            ↗ Quase lá — colete mais dados para atingir p &lt; 0.05
          </span>
        )}
        {!isSignificant && confidence < 85 && (
          <span className="body-s" style={{ color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>
            ⚠ Sem diferença detectável ainda (p={pValue.toFixed(3)}) — precisa mais tempo ou amostra maior
          </span>
        )}
      </div>
    </section>
  );
}

// ─── DailyChartCard: linha A vs B por dia (sparkline SVG) ───────────────────
function DailyChartCard({ daily, variants }: { daily: DailyPoint[]; variants: VariantStats[] }) {
  // Agrupa por dia (YYYY-MM-DD) e calcula taxa de conversão por variante
  const byDay = new Map<string, Map<string, { exposures: number; conversions: number }>>();
  for (const p of daily) {
    const dayKey = String(p.day).slice(0, 10);
    if (!byDay.has(dayKey)) byDay.set(dayKey, new Map());
    const inner = byDay.get(dayKey)!;
    const cur = inner.get(p.variantKey) ?? { exposures: 0, conversions: 0 };
    cur.exposures += Number(p.exposures) || 0;
    cur.conversions += Number(p.conversions) || 0;
    inner.set(p.variantKey, cur);
  }
  const sortedDays = Array.from(byDay.keys()).sort();
  const series = variants.slice(0, 2).map((v, i) => ({
    key: v.variantKey,
    name: v.variantName,
    color: i === 0 ? 'var(--fg-muted)' : 'var(--accent)',
    points: sortedDays.map(d => {
      const s = byDay.get(d)!.get(v.variantKey) ?? { exposures: 0, conversions: 0 };
      return s.exposures > 0 ? (s.conversions / s.exposures) * 100 : 0;
    }),
  }));

  const w = 600, h = 180, pad = 28;
  const allPts = series.flatMap(s => s.points);
  const max = Math.max(...allPts, 1) * 1.1;
  const x = (i: number) => pad + (i / Math.max(sortedDays.length - 1, 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);

  if (sortedDays.length === 0) {
    return (
      <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-2)' }}>Conversão dia a dia</h3>
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Sem dados temporais ainda — execute o experimento por pelo menos 1 dia.</p>
      </section>
    );
  }

  return (
    <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>Conversão dia a dia</h3>
        <span className="caption">A vs B · {sortedDays.length}d</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(g => (
          <line key={g} x1={pad} x2={w - pad} y1={pad + g * (h - pad * 2)} y2={pad + g * (h - pad * 2)} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        {series.map(s => (
          <path
            key={s.key}
            d={s.points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
          />
        ))}
        {series.map(s => s.points.map((v, i) => (
          <circle key={`${s.key}-${i}`} cx={x(i)} cy={y(v)} r="3" fill={s.color} />
        )))}
        {sortedDays.map((d, i) => (
          i % Math.ceil(sortedDays.length / 6) === 0
            ? <text key={d} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--fg-secondary)" fontFamily="var(--font-mono)">{d.slice(5)}</text>
            : null
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
        {series.map(s => (
          <span key={s.key} className="caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            {s.name}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── CautionsCard: 4 cuidados antes de declarar vencedor ───────────────────
function CautionsCard({ sampleSize, lift, days }: { sampleSize: number; lift: number; days: number }) {
  const cautions = [
    {
      tone: sampleSize > 1000 ? 'ok' : 'warn',
      glyph: sampleSize > 1000 ? '✓' : '⚠',
      title: 'Tamanho de amostra',
      body: `n = ${sampleSize.toLocaleString('pt-BR')} é ${sampleSize > 1000 ? 'adequado' : 'baixo'} pra detectar lift de ${Math.abs(lift).toFixed(1)}%${sampleSize <= 1000 ? '. Considere rodar mais alguns dias antes de decidir' : ''}.`,
    },
    {
      tone: days >= 4 ? 'ok' : 'warn',
      glyph: days >= 4 ? '✓' : '⚠',
      title: days >= 4 ? 'Sem viés de novidade' : 'Viés de novidade possível',
      body: days >= 4
        ? 'Conversão se mantém estável a partir do dia 4 (não é só efeito "novo").'
        : `Apenas ${days}d rodando — efeito novidade pode estar influenciando. Aguarde dia 4+ pra confirmar tendência.`,
    },
    {
      tone: days < 14 ? 'warn' : 'ok',
      glyph: days < 14 ? '⚠' : '✓',
      title: days < 14 ? 'Período curto pra capturar sazonalidade' : 'Sazonalidade coberta',
      body: days < 14
        ? `${days}d não cobrem ciclo completo de pagamento (5 e 10 do mês). Resultado pode mudar em meses futuros.`
        : 'Ciclo mensal completo coberto.',
    },
    {
      tone: 'info' as const,
      glyph: 'ⓘ',
      title: 'Múltiplos testes simultâneos',
      body: 'Aplicada correção de Bonferroni — confiança reportada já está ajustada para falsos positivos por múltiplas comparações.',
    },
  ];

  const TONE_FG: Record<string, string> = {
    ok: 'var(--success)',
    warn: 'var(--warning)',
    info: 'var(--info)',
    error: 'var(--error)',
  };

  return (
    <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
      <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-4)' }}>Cuidados antes de declarar vencedor</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {cautions.map((c, i) => (
          <li key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-3)', alignItems: 'start' }}>
            <span style={{
              width: 28, height: 28, borderRadius: 'var(--radius-full)',
              background: 'var(--bg-subtle)', color: TONE_FG[c.tone] ?? 'var(--fg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 'var(--w-semibold)',
            }}>
              {c.glyph}
            </span>
            <div>
              <p style={{ fontWeight: 'var(--w-semibold)', fontSize: 'var(--text-body-s)', marginBottom: 2 }}>{c.title}</p>
              <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
