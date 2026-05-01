'use client';

import { useEffect, useMemo, useState } from 'react';

interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface OverrideRow {
  id: string;
  productId: string;
  recommendedProductId: string;
  overrideType: 'pin' | 'exclude' | string;
  createdAt: string;
  target: { id: string; name: string; slug: string; status: string } | null;
}

export function RecommendationsClient({
  productId,
  catalog,
}: {
  productId: string;
  catalog: CatalogProduct[];
}) {
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<CatalogProduct | null>(null);
  const [overrideType, setOverrideType] = useState<'pin' | 'exclude'>('pin');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function loadOverrides() {
    setLoading(true);
    try {
      const res = await fetch(`/api/recommendations/overrides?productId=${productId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao carregar overrides');
      setOverrides(data.overrides ?? []);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Falha ao carregar' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverrides();
  }, [productId]);

  const pinned = overrides.filter((o) => o.overrideType === 'pin');
  const excluded = overrides.filter((o) => o.overrideType === 'exclude');

  // Filtragem de catálogo no input search (client-side)
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const usedIds = new Set(overrides.map((o) => o.recommendedProductId));
    return catalog
      .filter(
        (p) =>
          !usedIds.has(p.id) &&
          (p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [search, overrides, catalog]);

  async function handleAdd() {
    if (!selectedTarget) {
      setMessage({ type: 'error', text: 'Selecione um produto da lista.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/recommendations/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          recommendedProductId: selectedTarget.id,
          overrideType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao criar override');
      setMessage({
        type: 'ok',
        text: `Override ${overrideType === 'pin' ? 'fixado' : 'bloqueado'} adicionado.`,
      });
      setSearch('');
      setSelectedTarget(null);
      await loadOverrides();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Falha ao criar' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remover este override?')) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/recommendations/overrides?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao remover');
      setMessage({ type: 'ok', text: 'Override removido.' });
      await loadOverrides();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Falha ao remover' });
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  };
  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Form: novo override */}
      <div
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          padding: 20,
          background: '#FFFFFF',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
          Adicionar override
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Tipo</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input
                type="radio"
                value="pin"
                checked={overrideType === 'pin'}
                onChange={() => setOverrideType('pin')}
              />
              Fixar no topo (pin)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input
                type="radio"
                value="exclude"
                checked={overrideType === 'exclude'}
                onChange={() => setOverrideType('exclude')}
              />
              Bloquear (exclude)
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 12, position: 'relative' }}>
          <label style={labelStyle}>Buscar produto por nome ou slug</label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedTarget(null);
            }}
            placeholder="ex: anel solitário"
            style={inputStyle}
          />
          {searchResults.length > 0 && !selectedTarget && (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                marginTop: 4,
                background: '#FFFFFF',
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTarget(p);
                      setSearch(p.name);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #F3F4F6',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {p.slug} · {p.status}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedTarget && (
            <p style={{ fontSize: 12, color: '#059669', marginTop: 6 }}>
              Selecionado: <strong>{selectedTarget.name}</strong>
            </p>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={submitting || !selectedTarget}
          style={{
            background: submitting || !selectedTarget ? '#9CA3AF' : '#111827',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            cursor: submitting || !selectedTarget ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Salvando...' : 'Adicionar override'}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 6,
            fontSize: 14,
            background: message.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
            color: message.type === 'ok' ? '#166534' : '#991B1B',
            border: `1px solid ${message.type === 'ok' ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Pinned */}
      <OverrideTable
        title="Fixados (pin)"
        emptyText="Nenhum produto fixado."
        rows={pinned}
        loading={loading}
        onRemove={handleRemove}
        accent="#059669"
      />

      {/* Excluded */}
      <OverrideTable
        title="Bloqueados (exclude)"
        emptyText="Nenhum produto bloqueado."
        rows={excluded}
        loading={loading}
        onRemove={handleRemove}
        accent="#B91C1C"
      />
    </div>
  );
}

function OverrideTable({
  title,
  emptyText,
  rows,
  loading,
  onRemove,
  accent,
}: {
  title: string;
  emptyText: string;
  rows: OverrideRow[];
  loading: boolean;
  onRemove: (id: string) => void;
  accent: string;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: accent }}>
        {title} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({rows.length})</span>
      </h2>
      {loading ? (
        <p style={{ fontSize: 14, color: '#9CA3AF' }}>Carregando...</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 14, color: '#9CA3AF' }}>{emptyText}</p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <thead style={{ background: '#F9FAFB' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Produto</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Slug</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '8px 12px', width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: '8px 12px' }}>
                  {r.target?.name ?? <em style={{ color: '#9CA3AF' }}>(produto removido)</em>}
                </td>
                <td style={{ padding: '8px 12px', color: '#6B7280' }}>{r.target?.slug ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: '#6B7280' }}>{r.target?.status ?? '—'}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <button
                    onClick={() => onRemove(r.id)}
                    style={{
                      background: 'transparent',
                      color: '#B91C1C',
                      border: '1px solid #FECACA',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
