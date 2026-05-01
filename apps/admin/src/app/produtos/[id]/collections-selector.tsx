'use client';

import { useState } from 'react';

interface CollectionRef {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  productId: string;
  initialProductCollections: CollectionRef[];
  allCollections: CollectionRef[];
}

export function CollectionsSelector({ productId, initialProductCollections, allCollections }: Props) {
  const [assigned, setAssigned] = useState<CollectionRef[]>(initialProductCollections);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);

  const assignedIds = new Set(assigned.map((c) => c.id));
  const available = allCollections.filter((c) => !assignedIds.has(c.id));

  async function handleAdd() {
    if (!selectedId) return;
    const col = allCollections.find((c) => c.id === selectedId);
    if (!col) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${productId}/collections`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ collectionId: selectedId }),
      });
      if (res.ok) {
        setAssigned((prev) => [...prev, col]);
        setSelectedId('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(collectionId: string) {
    setBusy(true);
    try {
      await fetch(`/api/products/${productId}/collections/${collectionId}`, { method: 'DELETE' });
      setAssigned((prev) => prev.filter((c) => c.id !== collectionId));
    } finally {
      setBusy(false);
    }
  }

  if (allCollections.length === 0) {
    return (
      <p className="caption" style={{ color: 'var(--fg-muted)' }}>
        Nenhuma coleção criada.{' '}
        <a href="/colecoes" style={{ color: 'var(--accent)' }}>Criar coleção</a>
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {assigned.length === 0 && (
          <span className="caption" style={{ color: 'var(--fg-muted)' }}>Nenhuma coleção atribuída.</span>
        )}
        {assigned.map((col) => (
          <span key={col.id} className="lj-badge lj-badge-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {col.name}
            <button
              type="button"
              onClick={() => handleRemove(col.id)}
              disabled={busy}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'inherit', fontSize: 14, marginLeft: 2 }}
              title="Remover"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {available.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="lj-input"
            style={{ flex: 1, minWidth: 180 }}
          >
            <option value="">Selecionar coleção…</option>
            {available.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedId || busy}
            className="lj-btn-secondary"
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
}
