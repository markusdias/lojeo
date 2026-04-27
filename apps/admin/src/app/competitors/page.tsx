'use client';

import { useEffect, useMemo, useState } from 'react';

interface Competitor {
  id: string;
  name: string;
  productUrl: string;
  ourProductId: string | null;
  lastPriceCents: number | null;
  lastInStock: boolean | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

interface HistoryPoint {
  id: string;
  competitorProductId: string;
  priceCents: number;
  inStock: boolean;
  capturedAt: string;
}

interface OurProduct {
  id: string;
  name: string;
  priceCents: number;
}

interface ApiResponse {
  competitors: Competitor[];
  history: Record<string, HistoryPoint[]>;
  ourProducts: OurProduct[];
}

function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function relTime(iso: string | null): string {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function Sparkline({ points, width = 140, height = 36 }: { points: HistoryPoint[]; width?: number; height?: number }) {
  if (points.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--fg-muted)' }}>
        sem histórico
      </div>
    );
  }
  const prices = points.map((p) => p.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(1, max - min);
  const stepX = width / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p.priceCents - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const lastY = height - ((prices[prices.length - 1]! - min) / range) * (height - 4) - 2;
  return (
    <svg width={width} height={height} role="img" aria-label="Histórico de preço últimos 30 dias">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
      <circle cx={width} cy={lastY} r={2.5} fill="var(--accent)" />
    </svg>
  );
}

export default function CompetitorsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [ourProductId, setOurProductId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scraping, setScraping] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/competitors');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: ApiResponse = await r.json();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const ourProductMap = useMemo(() => {
    const m = new Map<string, OurProduct>();
    for (const p of data?.ourProducts ?? []) m.set(p.id, p);
    return m;
  }, [data]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          productUrl: url.trim(),
          ourProductId: ourProductId || null,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${r.status}`);
      }
      setName(''); setUrl(''); setOurProductId('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScrape(id: string) {
    setScraping(id);
    try {
      const r = await fetch(`/api/competitors/${id}/scrape`, { method: 'POST' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        // Modo degradado: mostra erro mas mantém UI; lastError fica visível no card
        setError((j as { error?: string }).error ?? `HTTP ${r.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScraping(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover concorrente e seu histórico?')) return;
    try {
      const r = await fetch(`/api/competitors/${id}`, { method: 'DELETE' });
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
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Concorrentes</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-secondary)', margin: '4px 0 0' }}>
            Monitore preços e estoque de produtos dos seus principais concorrentes.
          </p>
        </div>
      </div>

      {/* Form cadastro inline */}
      <form
        onSubmit={handleCreate}
        className="lj-card"
        style={{ padding: 16, marginBottom: 24, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1.3fr 1fr auto' }}
        aria-label="Cadastrar concorrente"
      >
        <div>
          <label htmlFor="competitor-name" style={{ display: 'block', fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 4 }}>
            Nome do produto
          </label>
          <input
            id="competitor-name"
            className="lj-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Anel solitário 18k Joalheria X"
            required
          />
        </div>
        <div>
          <label htmlFor="competitor-url" style={{ display: 'block', fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 4 }}>
            URL do produto
          </label>
          <input
            id="competitor-url"
            className="lj-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
          />
        </div>
        <div>
          <label htmlFor="competitor-our-product" style={{ display: 'block', fontSize: 11, color: 'var(--fg-secondary)', marginBottom: 4 }}>
            Produto nosso (opcional)
          </label>
          <select
            id="competitor-our-product"
            className="lj-input"
            value={ourProductId}
            onChange={(e) => setOurProductId(e.target.value)}
          >
            <option value="">— sem espelho —</option>
            {(data?.ourProducts ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="submit" className="lj-btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="lj-card" style={{ padding: 12, marginBottom: 16, borderColor: 'var(--error)', color: 'var(--error)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>Carregando…</p>}

      {!loading && (data?.competitors.length ?? 0) === 0 && (
        <div className="lj-card" style={{ padding: 32, textAlign: 'center', color: 'var(--fg-secondary)' }}>
          Nenhum concorrente cadastrado ainda. Use o formulário acima para começar.
        </div>
      )}

      {!loading && (data?.competitors.length ?? 0) > 0 && (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
          {data!.competitors.map((c) => {
            const points = data!.history[c.id] ?? [];
            const our = c.ourProductId ? ourProductMap.get(c.ourProductId) : undefined;
            const gapPct = our && c.lastPriceCents && c.lastPriceCents > 0
              ? Math.round(((our.priceCents - c.lastPriceCents) / c.lastPriceCents) * 1000) / 10
              : null;
            const gapDir: 'lower' | 'higher' | 'equal' | null = gapPct == null
              ? null
              : gapPct < 0 ? 'lower' : gapPct > 0 ? 'higher' : 'equal';
            return (
              <article key={c.id} className="lj-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    <a
                      href={c.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}
                    >
                      {c.productUrl}
                    </a>
                  </div>
                  <span className={c.lastInStock === false ? 'lj-badge lj-badge-warning' : c.lastInStock === true ? 'lj-badge lj-badge-success' : 'lj-badge lj-badge-neutral'}>
                    {c.lastInStock === false ? 'Sem estoque' : c.lastInStock === true ? 'Em estoque' : 'Sem dado'}
                  </span>
                </header>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--fg)' }}>
                    {formatBRL(c.lastPriceCents)}
                  </span>
                  {gapPct != null && gapDir && (
                    <span
                      className={
                        gapDir === 'lower' ? 'lj-badge lj-badge-success' :
                        gapDir === 'higher' ? 'lj-badge lj-badge-warning' :
                        'lj-badge lj-badge-neutral'
                      }
                      title={our ? `Nosso preço: ${formatBRL(our.priceCents)}` : undefined}
                      style={{ fontSize: 11 }}
                    >
                      {gapDir === 'lower' && 'Nosso menor '}
                      {gapDir === 'higher' && 'Nosso maior '}
                      {gapDir === 'equal' && 'Igual'}
                      {gapDir !== 'equal' && `${Math.abs(gapPct)}%`}
                    </span>
                  )}
                </div>

                <Sparkline points={points} />

                <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                    Checado {relTime(c.lastCheckedAt)}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="lj-btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleScrape(c.id)}
                      disabled={scraping === c.id}
                      aria-label={`Coletar preço de ${c.name}`}
                    >
                      {scraping === c.id ? 'Coletando…' : 'Coletar'}
                    </button>
                    <button
                      type="button"
                      className="lj-btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px', color: 'var(--error)' }}
                      onClick={() => handleDelete(c.id)}
                      aria-label={`Remover ${c.name}`}
                    >
                      Remover
                    </button>
                  </div>
                </footer>

                {c.lastError && (
                  <p style={{ fontSize: 11, color: 'var(--error)', margin: 0 }}>
                    Última coleta falhou: {c.lastError} (mantendo último valor conhecido)
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
