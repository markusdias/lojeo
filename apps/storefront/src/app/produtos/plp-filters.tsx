'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { ProductCard } from '../../components/ui/product-card';
import { useTracker } from '../../components/tracker-provider';

const MATERIALS = [
  { slug: 'ouro-18k',   label: 'Ouro 18k',   swatch: '#C9A85C' },
  { slug: 'ouro-14k',   label: 'Ouro 14k',   swatch: '#D4B468' },
  { slug: 'prata-925',  label: 'Prata 925',   swatch: '#A8A8A8' },
  { slug: 'banho-ouro', label: 'Banho a ouro', swatch: '#DBC27A' },
];

const STONES = [
  { slug: 'diamante',     label: 'Diamante' },
  { slug: 'topazio',      label: 'Topázio' },
  { slug: 'agua-marinha', label: 'Água-marinha' },
  { slug: 'perola',       label: 'Pérola' },
];

const SIZES = [12, 13, 14, 15, 16, 17, 18, 19, 20];

interface PLPProduct {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  comparePriceCents?: number | null;
  customFields: Record<string, unknown>;
}

interface PLPFiltersProps {
  products: PLPProduct[];
  currency: string;
  initialSort?: string;
  initialQ?: string;
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

function normalizeStone(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: '1px solid var(--divider)' }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: 14,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 14,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

export function PLPFilters({ products, currency, initialSort = 'novidades', initialQ }: PLPFiltersProps) {
  const maxPrice = Math.max(...products.map(p => p.priceCents), 500000);
  const [materials, setMaterials] = useState<string[]>([]);
  const [stones, setStones] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(maxPrice);
  const [size, setSize] = useState<number | null>(null);
  const [sort, setSort] = useState(initialSort);
  const [q, setQ] = useState(initialQ ?? '');
  const [page, setPage] = useState(1);
  const tracker = useTracker();

  const PAGE_SIZE = 24;

  const filtered = useMemo(() => {
    let out = products.filter(p => {
      if (materials.length) {
        const mat = String(p.customFields['material'] ?? '').toLowerCase().replace(/\s/g, '-');
        if (!materials.some(m => mat.includes(m))) return false;
      }
      if (stones.length) {
        const stone = normalizeStone(p.customFields['pedra'] ?? p.customFields['stone']);
        if (!stone || !stones.some(s => stone.includes(s))) return false;
      }
      if (p.priceCents > priceMax) return false;
      if (size !== null) {
        const aro = p.customFields['aro'];
        if (String(aro) !== String(size)) return false;
      }
      if (q) {
        const lower = q.toLowerCase();
        if (!p.name.toLowerCase().includes(lower)) return false;
      }
      return true;
    });
    if (sort === 'preco-asc') out = [...out].sort((a, b) => a.priceCents - b.priceCents);
    if (sort === 'preco-desc') out = [...out].sort((a, b) => b.priceCents - a.priceCents);
    return out;
  }, [products, materials, stones, priceMax, size, sort, q]);

  const pageItems = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = pageItems.length < filtered.length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 56 }}>
      {/* Filtros sidebar */}
      <aside>
        {/* Busca */}
        <div style={{ marginBottom: 24 }}>
          <input
            type="search"
            placeholder="Buscar peças…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              border: '1px solid var(--divider)', borderRadius: 2,
              background: 'var(--surface)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <FilterGroup title="Material">
          {MATERIALS.map(m => (
            <label key={m.slug} style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={materials.includes(m.slug)}
                onChange={() => { setMaterials(prev => toggle(prev, m.slug)); setPage(1); }}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
              />
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 999, background: m.swatch, border: '1px solid #00000020', flexShrink: 0 }} />
              {m.label}
            </label>
          ))}
        </FilterGroup>

        <FilterGroup title="Pedra">
          {STONES.map(s => (
            <label key={s.slug} style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={stones.includes(s.slug)}
                onChange={() => { setStones(prev => toggle(prev, s.slug)); setPage(1); }}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
              />
              {s.label}
            </label>
          ))}
        </FilterGroup>

        <FilterGroup title="Preço até">
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={5000}
            value={priceMax}
            onChange={e => { setPriceMax(Number(e.target.value)); setPage(1); }}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            {(priceMax / 100).toLocaleString('pt-BR', { style: 'currency', currency })}
          </div>
        </FilterGroup>

        <FilterGroup title="Aro">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SIZES.map(s => (
              <button
                key={s}
                onClick={() => { setSize(prev => prev === s ? null : s); setPage(1); }}
                style={{
                  padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 2,
                  background: size === s ? 'var(--text-primary)' : 'var(--surface)',
                  color: size === s ? '#fff' : 'var(--text-primary)',
                  border: `1px solid ${size === s ? 'var(--text-primary)' : 'var(--divider)'}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </FilterGroup>

        {/* Limpar */}
        {(materials.length > 0 || stones.length > 0 || size !== null || q) && (
          <button
            onClick={() => { setMaterials([]); setStones([]); setSize(null); setQ(''); setPriceMax(maxPrice); setPage(1); }}
            style={{
              fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
              background: 'none', border: 'none', padding: 0, textDecoration: 'underline',
            }}
          >
            Limpar filtros
          </button>
        )}
      </aside>

      {/* Grid produtos */}
      <div>
        {/* Ordenação */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1); }}
            style={{
              padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 14,
              border: '1px solid var(--divider)', borderRadius: 2, background: 'var(--surface)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="novidades">Mais recentes</option>
            <option value="preco-asc">Preço: menor primeiro</option>
            <option value="preco-desc">Preço: maior primeiro</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Nenhuma peça encontrada com esses filtros.</p>
            <button
              onClick={() => { setMaterials([]); setStones([]); setSize(null); setQ(''); setPriceMax(maxPrice); }}
              style={{ marginTop: 16, fontSize: 14, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {pageItems.map(p => (
                <div
                  key={p.id}
                  onClick={initialQ ? () => tracker?.track({ type: 'search_clicked', entityType: 'product', entityId: p.id, metadata: { query: initialQ, slug: p.slug } }) : undefined}
                >
                  <ProductCard
                    id={p.id}
                    name={p.name}
                    slug={p.slug}
                    priceCents={p.priceCents}
                    comparePriceCents={p.comparePriceCents}
                    currency={currency}
                  />
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 64 }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    padding: '14px 40px', fontSize: 14, fontWeight: 500,
                    background: 'transparent', color: 'var(--text-primary)',
                    border: '1px solid var(--text-primary)', borderRadius: 8, cursor: 'pointer',
                  }}
                >
                  Carregar mais ({filtered.length - pageItems.length} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
