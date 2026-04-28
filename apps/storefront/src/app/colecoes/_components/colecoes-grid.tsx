'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../../../components/ui/icon';

interface CollectionItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
  href?: string;
}

interface ColecoesGridProps {
  items: CollectionItem[];
  initialSort?: string;
  usingFallback?: boolean;
}

const PAGE_SIZE = 9;

const ETIQUETAS = [
  { slug: 'todas', label: 'Todas' },
  { slug: 'destaque', label: 'Em destaque' },
  { slug: 'sazonal', label: 'Sazonais' },
  { slug: 'edicao-limitada', label: 'Edições limitadas' },
];

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: '1px solid var(--divider)' }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: 14,
          fontWeight: 500,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

export function ColecoesGrid({ items, initialSort = 'recentes', usingFallback }: ColecoesGridProps) {
  const [sort, setSort] = useState(initialSort);
  const [etiqueta, setEtiqueta] = useState<string>('todas');
  const [minProdutos, setMinProdutos] = useState(0);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let out = [...items];
    if (minProdutos > 0) out = out.filter(c => c.productCount >= minProdutos);
    // Etiqueta é só visual no fallback — sem campo no schema. Mantém todos.
    if (sort === 'nome-asc') out.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (sort === 'nome-desc') out.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
    if (sort === 'produtos-desc') out.sort((a, b) => b.productCount - a.productCount);
    return out;
  }, [items, sort, minProdutos]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function clearFilters() {
    setEtiqueta('todas');
    setMinProdutos(0);
    setSort('recentes');
    setPage(1);
  }

  const hasActiveFilters = etiqueta !== 'todas' || minProdutos > 0;

  return (
    <div className="colecoes-layout">
      <aside aria-label="Filtros de coleções" className="colecoes-sidebar">
        <FilterGroup title="Etiqueta">
          {ETIQUETAS.map(e => (
            <label
              key={e.slug}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="etiqueta"
                value={e.slug}
                checked={etiqueta === e.slug}
                onChange={() => { setEtiqueta(e.slug); setPage(1); }}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
              />
              {e.label}
            </label>
          ))}
        </FilterGroup>

        <FilterGroup title="Tamanho mínimo">
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={minProdutos}
            onChange={e => { setMinProdutos(Number(e.target.value)); setPage(1); }}
            aria-label="Número mínimo de peças por coleção"
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            {minProdutos === 0 ? 'Todas as coleções' : `${minProdutos}+ peças`}
          </div>
        </FilterGroup>

        <FilterGroup title="Atalhos">
          <Link
            href="/produtos"
            style={{ fontSize: 14, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            Ver todas as peças
            <Icon name="arrow" size={14} />
          </Link>
          <Link
            href="/produtos?ordenar=novidades"
            style={{ fontSize: 14, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            Novidades
            <Icon name="arrow" size={14} />
          </Link>
        </FilterGroup>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
              background: 'none', border: 'none', padding: 0, textDecoration: 'underline',
            }}
          >
            Limpar filtros
          </button>
        )}
      </aside>

      <div>
        {/* Sort row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          {usingFallback ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Mostrando categorias clássicas — coleções curadas em breve.
            </p>
          ) : <span />}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              Ordenar por
            </span>
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1); }}
              aria-label="Ordenar coleções"
              style={{
                padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 14,
                border: '1px solid var(--divider)', borderRadius: 2, background: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="recentes">Mais relevantes</option>
              <option value="nome-asc">Nome: A–Z</option>
              <option value="nome-desc">Nome: Z–A</option>
              <option value="produtos-desc">Mais peças</option>
            </select>
          </label>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 16 }}>
              Nenhuma coleção atende aos filtros atuais.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              style={{ fontSize: 14, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="colecoes-grid">
              {pageItems.map((c, idx) => (
                <CollectionCard key={c.id} c={c} highlight={idx === 0 && currentPage === 1} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Paginação de coleções"
                style={{
                  display: 'flex', justifyContent: 'center', gap: 8, marginTop: 60,
                }}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={currentPage === n ? 'page' : undefined}
                    aria-label={`Página ${n}`}
                    style={{
                      width: 36, height: 36, borderRadius: 2, fontSize: 13, cursor: 'pointer',
                      background: currentPage === n ? 'var(--text-primary)' : 'var(--surface)',
                      color: currentPage === n ? 'var(--text-on-dark)' : 'var(--text-primary)',
                      border: `1px solid ${currentPage === n ? 'var(--text-primary)' : 'var(--divider)'}`,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Próxima página"
                  style={{
                    width: 36, height: 36, borderRadius: 2,
                    background: 'var(--surface)', border: '1px solid var(--divider)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: 'var(--text-primary)',
                    display: 'grid', placeItems: 'center',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                  }}
                >
                  <Icon name="chevron" size={16} />
                </button>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Layout responsivo */}
      <style jsx>{`
        .colecoes-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 56px;
        }
        .colecoes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .colecoes-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .colecoes-layout {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .colecoes-sidebar {
            border-bottom: 1px solid var(--divider);
            padding-bottom: 8px;
          }
          .colecoes-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function CollectionCard({ c, highlight }: { c: CollectionItem; highlight?: boolean }) {
  const badge = highlight ? 'Em destaque' : c.productCount >= 8 ? 'Mais querida' : null;

  return (
    <Link
      href={c.href ?? `/colecoes/${c.slug}`}
      aria-label={`Abrir coleção ${c.name}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--surface)',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        data-product-image
        style={{
          aspectRatio: '1 / 1',
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div data-product-placeholder style={{ position: 'absolute', inset: 0 }} />
        <span
          aria-hidden="true"
          style={{
            width: 56, height: 56, borderRadius: 999,
            border: '1px solid var(--divider)',
            display: 'grid', placeItems: 'center',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
          }}
        >
          <Icon name="sparkle" size={22} />
        </span>

        {badge && (
          <span
            style={{
              position: 'absolute', top: 12, left: 12,
              fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '5px 10px', borderRadius: 999, fontWeight: 500,
              background: highlight ? 'var(--accent-soft)' : 'var(--surface)',
              color: highlight ? 'var(--accent)' : 'var(--text-primary)',
              border: highlight ? 'none' : '1px solid var(--divider)',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div style={{ padding: '14px 4px 18px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            margin: 0,
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: 'var(--display-tracking)',
          }}
        >
          {c.name}
        </h2>
        {c.description && (
          <p
            style={{
              fontSize: 13,
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              margin: '6px 0 10px',
              lineHeight: 1.5,
              maxWidth: '34ch',
            }}
          >
            {c.description}
          </p>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
          {c.productCount > 0
            ? `${c.productCount} ${c.productCount === 1 ? 'peça' : 'peças'}`
            : 'Explorar coleção'}
        </div>
      </div>
    </Link>
  );
}
