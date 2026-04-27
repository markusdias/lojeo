'use client';

import { useEffect, useState } from 'react';
import { EmptyState, IconImage } from '../../components/ui/empty-state';
import { TagEditor, type TaggedProduct } from '../../components/ugc/tag-editor';

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
  productsTagged: TaggedProduct[];
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
  const [editingPost, setEditingPost] = useState<UgcPost | null>(null);

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
        <p className="body-s">Moderação de fotos enviadas pelos clientes</p>
      </header>

      {/* Filtros pill chips */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {['', 'pending', 'approved', 'rejected'].map(s => {
          const active = filter === s;
          const sc = s ? (STATUS_COLOR[s] ?? STATUS_COLOR['pending']!) : null;
          return (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-body-s)',
                fontWeight: 'var(--w-medium)',
                cursor: 'pointer',
                background: active ? 'var(--neutral-900)' : 'var(--bg-elevated)',
                color: active ? 'var(--surface)' : 'var(--fg)',
                border: active ? '1px solid var(--neutral-900)' : '1px solid var(--border-strong)',
              }}
            >
              {sc && (
                <span aria-hidden style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: sc.text,
                  display: 'inline-block',
                }} />
              )}
              {s === '' ? 'Todos' : STATUS_LABEL[s]}
              {s && counts[s] !== undefined && (
                <span className="numeric" style={{ color: active ? 'var(--surface)' : 'var(--fg-secondary)', fontWeight: 'var(--w-regular)' }}>
                  {counts[s]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="body-s">Carregando...</p>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<IconImage />}
          title="Sem fotos da comunidade ainda"
          description="Ative o badge 'compartilhe sua peça' nos emails pós-entrega — nas primeiras semanas, conversão de UGC sobe rápido com 1 incentivo simples."
          action={{ label: 'Configurar email pós-entrega', href: '/settings' }}
          secondaryAction={{ label: 'Importar do Instagram', href: '/integracoes' }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {posts.map(p => {
            const sc = STATUS_COLOR[p.status] ?? STATUS_COLOR['pending']!;
            return (
              <div key={p.id} className="lj-card" style={{ overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1', background: 'var(--bg-subtle)', position: 'relative' }}>
                  <img
                    src={p.thumbnailUrl ?? p.imageUrl}
                    alt={p.caption ?? 'UGC'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 'var(--space-2)',
                    right: 'var(--space-2)',
                    padding: '2px 8px',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--w-semibold)',
                    borderRadius: 'var(--radius-full)',
                    background: sc.bg,
                    color: sc.text,
                  }}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <div style={{ padding: 'var(--space-3)' }}>
                  <p className="caption">
                    {p.customerName ?? p.customerEmail ?? 'Anônimo'}
                  </p>
                  <p className="caption numeric" style={{ marginTop: 2 }}>
                    {new Date(p.createdAt).toLocaleString('pt-BR')}
                  </p>
                  {p.caption && (
                    <p className="body-s" style={{
                      marginTop: 'var(--space-2)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {p.caption}
                    </p>
                  )}
                  {p.rejectionReason && (
                    <p className="caption" style={{ marginTop: 'var(--space-2)', color: 'var(--error)' }}>
                      Rejeitada: {p.rejectionReason}
                    </p>
                  )}
                  {p.productsTagged.length > 0 && (
                    <p className="caption" style={{ marginTop: 'var(--space-2)', color: 'var(--accent)' }}>
                      🏷 {p.productsTagged.length} produto{p.productsTagged.length !== 1 ? 's' : ''} tagueado{p.productsTagged.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  {p.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                      <button
                        onClick={() => approve(p.id)}
                        className="lj-btn-primary"
                        style={{ flex: 1, fontSize: 'var(--text-caption)' }}
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => reject(p.id)}
                        className="lj-btn-secondary"
                        style={{ flex: 1, fontSize: 'var(--text-caption)', color: 'var(--error)', borderColor: 'var(--error)' }}
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                  {p.status === 'approved' && (
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <button
                        type="button"
                        onClick={() => setEditingPost(p)}
                        className="lj-btn-secondary"
                        style={{ width: '100%', fontSize: 'var(--text-caption)' }}
                      >
                        {p.productsTagged.length > 0 ? 'Editar tags' : 'Adicionar tags de produto'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="caption">
        Editor de &quot;compre o look&quot; (tags posicionais) ativo: clique em &quot;Editar tags&quot; nos posts aprovados.
      </p>

      {editingPost && (
        <TagEditor
          postId={editingPost.id}
          imageUrl={editingPost.imageUrl}
          initialTags={editingPost.productsTagged ?? []}
          onClose={() => setEditingPost(null)}
          onSaved={(nextTags) => {
            setPosts(prev => prev.map(p => (p.id === editingPost.id ? { ...p, productsTagged: nextTags } : p)));
          }}
        />
      )}
    </div>
  );
}
