'use client';

import { useState, useEffect, useCallback } from 'react';
import { EmptyState, IconStar } from '../../components/ui/empty-state';

interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string | null;
  anonymousName: string | null;
  status: string;
  adminResponse: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
}

type Tab = 'pending' | 'approved' | 'rejected';

function Stars({ value }: { value: number }) {
  return (
    <span style={{ color: '#C9A85C', letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= value ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

export default function AvaliacoesPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reviews?status=${tab}`);
    const data = await res.json() as { rows: Review[]; counts: Record<Tab, number> } | Review[];
    // Back-compat: aceitar Review[] legado também
    if (Array.isArray(data)) {
      setReviews(data);
    } else {
      setReviews(data.rows);
      setCounts(data.counts);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    setSaving(id);
    await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, adminResponse: responseTexts[id] ?? null }),
    });
    setSaving(null);
    await load();
  }

  const TAB_LABELS: Record<Tab, string> = {
    pending: 'Pendentes',
    approved: 'Aprovadas',
    rejected: 'Rejeitadas',
  };

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Avaliações</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-200">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-2 ${
                active
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {TAB_LABELS[t]}
              <span style={{
                fontSize: 11,
                color: active ? 'var(--accent)' : 'var(--fg-muted)',
                background: active ? 'var(--accent-soft)' : 'var(--neutral-50)',
                padding: '1px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 500,
              }}>
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-neutral-500">Carregando…</p>}

      {!loading && reviews.length === 0 && (
        tab === 'pending' ? (
          <EmptyState
            icon={<IconStar />}
            title="Nenhuma avaliação ainda"
            description="Convide quem comprou nos últimos 7 dias — costuma render 3× mais resposta que pedidos automáticos pós-30 dias."
            action={{ label: 'Enviar convite', href: '/clientes' }}
            secondaryAction={{ label: 'Configurar automação', href: '/settings' }}
          />
        ) : (
          <EmptyState
            icon={<IconStar />}
            title={`Sem avaliações ${TAB_LABELS[tab].toLowerCase()}`}
            description={tab === 'approved' ? 'Aprovações aparecem aqui após você aprovar na aba Pendentes.' : 'Avaliações rejeitadas ficam neste histórico para auditoria.'}
          />
        )
      )}

      {!loading && reviews.length > 0 && (
        <div className="flex flex-col gap-4">
          {reviews.map(r => (
            <div key={r.id} className="border border-neutral-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Stars value={r.rating} />
                    {r.verifiedPurchase && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                        Compra verificada
                      </span>
                    )}
                    <span className="text-xs text-neutral-400">
                      {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {r.title && <p className="font-medium text-sm mb-1">{r.title}</p>}
                  {r.body && <p className="text-sm text-neutral-600 leading-relaxed">{r.body}</p>}
                  <p className="text-xs text-neutral-400 mt-2">
                    {r.anonymousName} · produto: <code className="font-mono">{r.productId.slice(0, 8)}…</code>
                  </p>
                  {r.adminResponse && (
                    <div className="mt-3 p-3 bg-neutral-50 rounded border-l-2 border-amber-400 text-sm text-neutral-600">
                      <span className="font-medium text-amber-700 block text-xs mb-1">Resposta da loja</span>
                      {r.adminResponse}
                    </div>
                  )}
                </div>

                {tab === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0 w-48">
                    <textarea
                      placeholder="Resposta opcional…"
                      rows={2}
                      value={responseTexts[r.id] ?? ''}
                      onChange={e => setResponseTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="text-xs border border-neutral-200 rounded p-2 resize-none w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(r.id, 'approved')}
                        disabled={saving === r.id}
                        className="flex-1 text-xs py-1.5 rounded bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleAction(r.id, 'rejected')}
                        disabled={saving === r.id}
                        className="flex-1 text-xs py-1.5 rounded bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
