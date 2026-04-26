'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export default function CollectionsPage() {
  const [list, setList] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch('/api/collections')
      .then(r => r.json())
      .then((d: { collections: Collection[] }) => { setList(d.collections ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName('');
    setSaving(false);
    load();
  }

  return (
    <div className="p-8 max-w-4xl">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Coleções</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Agrupe produtos em coleções para exibir no storefront</p>
        </div>
        <span style={{ fontSize: 13, color: '#6B7280' }}>{list.length} coleção(ões)</span>
      </div>

      {/* Quick create */}
      <form onSubmit={e => { void handleCreate(e); }} style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome da coleção…"
          style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: 6, padding: '8px 12px', fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          style={{ background: '#111827', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Criando…' : 'Criar'}
        </button>
      </form>

      {loading && <p style={{ color: '#6B7280', fontSize: 14 }}>Carregando…</p>}

      {!loading && list.length === 0 && (
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Nenhuma coleção criada ainda.</p>
      )}

      {!loading && list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(c => (
            <div key={c.id} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  /{c.slug} · criada {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                </p>
                {c.description && <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{c.description}</p>}
              </div>
              <Link
                href={`/collections/${c.id}`}
                style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none' }}
              >
                Editar →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
