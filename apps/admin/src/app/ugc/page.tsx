'use client';

import { useEffect, useState } from 'react';

interface UgcPost {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  source: string;
  rejectionReason: string | null;
  productsTagged: Array<{ productId: string; x: number; y: number; label?: string }>;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  moderating: 'Moderando',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:    { bg: '#FFF7ED', text: '#92400E' },
  moderating: { bg: '#FEF3C7', text: '#78350F' },
  approved:   { bg: '#F0FDF4', text: '#166534' },
  rejected:   { bg: '#FEF2F2', text: '#991B1B' },
};

const REJECTION_REASONS = [
  'Imagem fora de foco ou baixa qualidade',
  'Conteúdo não relacionado à loja',
  'Marca ou logotipo de concorrente visível',
  'Conteúdo impróprio',
  'Outro',
];

export default function UgcModerationPage() {
  const [posts, setPosts] = useState<UgcPost[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  function load() {
    setLoading(true);
    fetch(`/api/ugc${filter ? `?status=${filter}` : ''}`)
      .then(r => r.json())
      .then((d: { posts: UgcPost[]; counts: Record<string, number> }) => {
        setPosts(d.posts ?? []);
        setCounts(d.counts ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(load, [filter]);

  async function approve(id: string) {
    await fetch(`/api/ugc/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    load();
  }

  async function reject(id: string) {
    const reason = prompt('Motivo da rejeição:', REJECTION_REASONS[0]);
    if (reason === null) return;
    await fetch(`/api/ugc/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
    });
    load();
  }

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Galeria de Clientes</h1>
        <p className="text-sm text-gray-500 mt-1">Moderação de fotos enviadas pelos clientes</p>
      </header>

      {/* Filtros + summary */}
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded text-sm border ${filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            {s === '' ? 'Todos' : STATUS_LABEL[s]}
            {s && counts[s] !== undefined && (
              <span className="ml-1.5 opacity-70">({counts[s]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma foto encontrada com este filtro.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {posts.map(p => {
            const sc = STATUS_COLOR[p.status] ?? STATUS_COLOR['pending']!;
            return (
              <div key={p.id} className="lj-card overflow-hidden">
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={p.thumbnailUrl ?? p.imageUrl}
                    alt={p.caption ?? 'UGC'}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-500">
                    {p.customerName ?? p.customerEmail ?? 'Anônimo'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.createdAt).toLocaleString('pt-BR')}
                  </p>
                  {p.caption && (
                    <p className="text-sm text-gray-800 mt-2 line-clamp-2">{p.caption}</p>
                  )}
                  {p.rejectionReason && (
                    <p className="text-xs text-red-600 mt-2">Rejeitada: {p.rejectionReason}</p>
                  )}
                  {p.productsTagged.length > 0 && (
                    <p className="text-xs text-indigo-600 mt-2">
                      🏷 {p.productsTagged.length} produto{p.productsTagged.length !== 1 ? 's' : ''} tagueado{p.productsTagged.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  {p.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => approve(p.id)}
                        className="flex-1 bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => reject(p.id)}
                        className="flex-1 bg-white text-red-600 border border-red-300 text-xs px-3 py-1.5 rounded hover:bg-red-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Editor de "compre o look" (tags posicionais) bloqueado por Design C — fila de moderação básica disponível.
      </p>
    </div>
  );
}
