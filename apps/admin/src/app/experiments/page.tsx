'use client';

import { useEffect, useState } from 'react';
import { InfoTooltip } from '../../components/ui/info-tooltip';
import { EmptyState } from '../../components/ui/empty-state';

interface Variant {
  key: string;
  name: string;
  weight: number;
  payload?: Record<string, unknown>;
}

interface Experiment {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  targetMetric: string;
  variants: Variant[];
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

interface Stats {
  [experimentId: string]: { [variantKey: string]: { exposures: number; conversions: number } };
}

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: '#F3F4F6', text: '#6B7280', label: 'Rascunho' },
  active:    { bg: '#F0FDF4', text: '#166534', label: 'Ativo' },
  paused:    { bg: '#FFF7ED', text: '#92400E', label: 'Pausado' },
  completed: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Concluído' },
};

type StatusFilter = 'all' | 'draft' | 'active' | 'paused' | 'completed';

export default function ExperimentsPage() {
  const [list, setList] = useState<Experiment[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');

  // Form state
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [variantsRaw, setVariantsRaw] = useState('a:Controle:50\nb:Variante:50');

  function load() {
    setLoading(true);
    fetch('/api/experiments')
      .then(async r => {
        const d = await r.json() as { experiments?: Experiment[]; stats?: Stats; error?: string };
        if (!r.ok) {
          setError(d.error ?? `HTTP ${r.status}`);
        } else {
          setList(d.experiments ?? []);
          setStats(d.stats ?? {});
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const variants = variantsRaw.split('\n').map(line => {
        const parts = line.split(':').map(s => s.trim());
        return {
          key: parts[0] ?? '',
          name: parts[1] ?? '',
          weight: Number(parts[2] ?? 0),
        };
      }).filter(v => v.key);

      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, name, description, variants }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        alert(`Erro: ${d.error ?? res.status}`);
        return;
      }
      setKey(''); setName(''); setDescription(''); setVariantsRaw('a:Controle:50\nb:Variante:50');
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/experiments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      alert(`Erro: ${d.error ?? res.status}`);
      return;
    }
    load();
  }

  async function deleteExp(id: string, name: string) {
    if (!confirm(`Excluir experimento "${name}"? Essa ação remove também todos os events e assignments.`)) return;
    const res = await fetch(`/api/experiments/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      alert(`Erro: ${d.error ?? res.status}`);
      return;
    }
    load();
  }

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ display: 'inline-flex', alignItems: 'center' }}>
            Experimentos A/B
            <InfoTooltip text="Status workflow: Draft → Active (coleta dados) → Paused (resultados parciais) → Completed (decisão final)." />
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
            Crie variantes, distribua tráfego e mensure conversão.
            <InfoTooltip text="Conversion% = conversões / exposições. Lift = (B−A)/A. Significância estatística requer ~1000 sessões por variante." />
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="lj-btn-primary"
        >
          {showForm ? 'Cancelar' : '+ Novo experimento'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleCreate} className="lj-card p-5 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Key (única, identificador legível)</label>
            <input
              type="text"
              required
              value={key}
              onChange={e => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
              placeholder="hero-headline-2026q2"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nome</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Headline do hero — Q2 2026"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
              Variantes (uma por linha: key:nome:peso)
              <InfoTooltip text="Soma deve ser 100. Ex: A=50, B=50 = 50/50. A=80, B=20 = 80% controle, 20% teste." />
            </label>
            <textarea
              value={variantsRaw}
              onChange={e => setVariantsRaw(e.target.value)}
              rows={4}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Soma dos pesos deve ser 100. Mínimo 2 variantes.</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="lj-btn-primary"
          >
            {saving ? 'Criando...' : 'Criar experimento'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="body-s">Carregando...</p>
      ) : error ? (
        <div className="lj-card" style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--warning-soft)', borderColor: 'var(--warning)' }}>
          <p className="body-s" style={{ color: 'var(--warning)' }}>{error}</p>
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon="🧪"
          title="Nenhum experimento ainda"
          description="Crie seu primeiro teste A/B para validar variações de hero, CTA, layout e medir conversão real."
          action={{ label: '+ Novo experimento', href: '#' }}
        />
      ) : (
        <>
          {/* Resumo IA dos testes — análise honesta de status agregado */}
          {(() => {
            const counts = {
              all: list.length,
              draft: list.filter(e => e.status === 'draft').length,
              active: list.filter(e => e.status === 'active').length,
              paused: list.filter(e => e.status === 'paused').length,
              completed: list.filter(e => e.status === 'completed').length,
            };
            const lowSample = list.filter(e => {
              if (e.status !== 'active') return false;
              const expStats = stats[e.id] ?? {};
              const total = Object.values(expStats).reduce((acc, s) => acc + s.exposures, 0);
              return total > 0 && total < 1000;
            });
            const summary = counts.active === 0
              ? 'Nenhum experimento rodando agora — crie um teste para começar a coletar dados.'
              : lowSample.length > 0
                ? `${counts.active} experimento(s) ativo(s). ${lowSample.length} ainda com tráfego baixo (<1k exposições) — confiança estatística limitada por enquanto.`
                : `${counts.active} experimento(s) ativo(s) coletando dados. Resultados acompanhados em tempo real.`;
            return (
              <div className="lj-ai-banner" style={{ flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span aria-hidden style={{ fontSize: 14, color: 'var(--accent)' }}>✦</span>
                  <span className="lj-ai-eyebrow">IA · Resumo dos testes</span>
                </div>
                <p className="body-s" style={{ margin: 0, lineHeight: 1.5 }}>{summary}</p>
              </div>
            );
          })()}

          {/* Filter chips — paridade design oficial */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            {([
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Ativos' },
              { id: 'paused', label: 'Pausados' },
              { id: 'completed', label: 'Concluídos' },
              { id: 'draft', label: 'Rascunhos' },
            ] as const).map(f => {
              const count = f.id === 'all' ? list.length : list.filter(e => e.status === f.id).length;
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={active ? 'lj-badge lj-badge-accent' : 'lj-badge lj-badge-neutral'}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.375rem 0.75rem',
                    fontSize: 'var(--text-body-s)',
                    fontWeight: active ? 'var(--w-semibold)' : 'var(--w-medium)',
                  }}
                >
                  {f.label} <span className="numeric" style={{ opacity: 0.7, marginLeft: 4 }}>{count}</span>
                </button>
              );
            })}
          </div>

        <div className="space-y-3">
          {list.filter(e => filter === 'all' ? true : e.status === filter).map(exp => {
            const sc = STATUS_COLOR[exp.status] ?? STATUS_COLOR['draft']!;
            const expStats = stats[exp.id] ?? {};

            // Resumo agregado por experimento — paridade ab-row-stats (visitantes/lift/confiança/progresso)
            const totalExposures = Object.values(expStats).reduce((a, s) => a + s.exposures, 0);
            const a = exp.variants[0];
            const b = exp.variants[1];
            const aStats = a ? expStats[a.key] ?? { exposures: 0, conversions: 0 } : null;
            const bStats = b ? expStats[b.key] ?? { exposures: 0, conversions: 0 } : null;
            const aRate = aStats && aStats.exposures > 0 ? (aStats.conversions / aStats.exposures) * 100 : 0;
            const bRate = bStats && bStats.exposures > 0 ? (bStats.conversions / bStats.exposures) * 100 : 0;
            const lift = aRate > 0 && bRate > 0 ? ((bRate - aRate) / aRate) * 100 : 0;
            // Heurística simples de confiança: cresce com sample size, ajustada por |lift|
            const conf = totalExposures > 0
              ? Math.min(99.9, 30 + Math.min(60, totalExposures / 50) + Math.abs(lift) * 0.8)
              : 0;
            const startedAt = exp.startedAt ? new Date(exp.startedAt) : null;
            const days = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 86400000)) : 0;
            const daysTotal = 14;
            const isDraft = exp.status === 'draft';
            const confColor = conf >= 95 ? 'var(--success)' : conf >= 85 ? 'var(--warning)' : 'var(--error)';
            const liftColor = lift > 0 ? 'var(--success)' : lift < 0 ? 'var(--error)' : 'var(--fg-muted)';

            return (
              <a
                key={exp.id}
                href={`/experiments/${exp.id}/results`}
                className="lj-card p-5"
                style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{exp.key}</code>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full" style={{ background: sc.bg, color: sc.text }}>
                        {sc.label}
                      </span>
                    </div>
                    <h2 className="text-base font-medium mt-1">{exp.name}</h2>
                    {exp.description && <p className="text-sm text-gray-500 mt-1">{exp.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={(ev) => ev.preventDefault()}>
                    {exp.status === 'draft' && (
                      <button onClick={(ev) => { ev.preventDefault(); changeStatus(exp.id, 'active'); }} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">▶ Iniciar</button>
                    )}
                    {exp.status === 'active' && (
                      <>
                        <button onClick={(ev) => { ev.preventDefault(); changeStatus(exp.id, 'paused'); }} className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700">⏸ Pausar</button>
                        <button onClick={(ev) => { ev.preventDefault(); changeStatus(exp.id, 'completed'); }} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">✓ Concluir</button>
                      </>
                    )}
                    {exp.status === 'paused' && (
                      <button onClick={(ev) => { ev.preventDefault(); changeStatus(exp.id, 'active'); }} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">▶ Retomar</button>
                    )}
                    <button onClick={(ev) => { ev.preventDefault(); deleteExp(exp.id, exp.name); }} className="text-xs text-red-600 hover:underline px-2">Excluir</button>
                  </div>
                </div>

                {/* Stats agregados — paridade ab-row-stats (ABEditor.jsx) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <p className="eyebrow">Exposições</p>
                    <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)' }}>
                      {isDraft ? '—' : totalExposures.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Conv. A → B</p>
                    <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)' }}>
                      {isDraft || !aStats || !bStats ? '—' : `${aRate.toFixed(1)}% → ${bRate.toFixed(1)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Lift</p>
                    <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)', color: liftColor }}>
                      {isDraft ? '—' : `${lift > 0 ? '+' : ''}${lift.toFixed(1)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Confiança</p>
                    <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)', color: confColor }}>
                      {isDraft || totalExposures === 0 ? '—' : `${conf.toFixed(1)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow">Tempo</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ flex: 1, height: 4, background: 'var(--neutral-100)', borderRadius: 999, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (days / daysTotal) * 100)}%`, background: 'var(--accent)' }} />
                      </span>
                      <span className="numeric" style={{ fontSize: 'var(--text-caption)', fontWeight: 'var(--w-medium)' }}>
                        {isDraft ? '—' : `${days}/${daysTotal}d`}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
