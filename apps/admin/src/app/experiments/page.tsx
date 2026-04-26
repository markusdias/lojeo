'use client';

import { useEffect, useState } from 'react';

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

export default function ExperimentsPage() {
  const [list, setList] = useState<Experiment[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
    <div className="p-8 max-w-5xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Experimentos A/B</h1>
          <p className="text-sm text-gray-500 mt-1">Crie variantes, distribua tráfego e mensure conversão.</p>
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
            <label className="block text-xs text-gray-600 mb-1">Variantes (uma por linha: key:nome:peso)</label>
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
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">{error}</div>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum experimento cadastrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {list.map(exp => {
            const sc = STATUS_COLOR[exp.status] ?? STATUS_COLOR['draft']!;
            const expStats = stats[exp.id] ?? {};
            return (
              <div key={exp.id} className="lj-card p-5">
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
                  <div className="flex gap-2 shrink-0">
                    {exp.status === 'draft' && (
                      <button onClick={() => changeStatus(exp.id, 'active')} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">▶ Iniciar</button>
                    )}
                    {exp.status === 'active' && (
                      <>
                        <button onClick={() => changeStatus(exp.id, 'paused')} className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700">⏸ Pausar</button>
                        <button onClick={() => changeStatus(exp.id, 'completed')} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">✓ Concluir</button>
                      </>
                    )}
                    {exp.status === 'paused' && (
                      <button onClick={() => changeStatus(exp.id, 'active')} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">▶ Retomar</button>
                    )}
                    <button onClick={() => deleteExp(exp.id, exp.name)} className="text-xs text-red-600 hover:underline px-2">Excluir</button>
                  </div>
                </div>

                {/* Variants table with stats */}
                <div className="mt-4 grid gap-2">
                  {exp.variants.map(v => {
                    const s = expStats[v.key] ?? { exposures: 0, conversions: 0 };
                    const rate = s.exposures > 0 ? (s.conversions / s.exposures) * 100 : 0;
                    return (
                      <div key={v.key} className="flex items-center justify-between text-sm border border-gray-100 rounded p-3">
                        <div className="flex items-center gap-3">
                          <code className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono">{v.key}</code>
                          <span>{v.name}</span>
                          <span className="text-xs text-gray-400">{v.weight}%</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-gray-500">{s.exposures} exposições</span>
                          <span className="text-gray-500">{s.conversions} conversões</span>
                          <span className="font-medium text-indigo-700">{rate.toFixed(2)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
