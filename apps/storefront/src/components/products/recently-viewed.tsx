'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lojeo_recently_viewed';
const MAX_ITEMS = 8;

interface RecentItem {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string;
  viewedAt: number;
}

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Hook util: registrar produto visto. Use na PDP.
 *
 * - Sempre persiste em localStorage (cliente anônimo + cache rápido)
 * - Se user logado: POST /api/recently-viewed (server detecta session)
 *   Server retorna 401 sem session → fire-and-forget
 */
export function useTrackRecentlyViewed(item: Omit<RecentItem, 'viewedAt'> | null) {
  useEffect(() => {
    if (!item || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: RecentItem[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter(i => i.productId !== item.productId);
      const next = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      // Server tracking (fire-and-forget; falha em 401 quando anônimo)
      void fetch('/api/recently-viewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId }),
        keepalive: true,
      }).catch(() => null);
    } catch { /* localStorage cheio ou bloqueado */ }
  }, [item]);
}

/**
 * Sync localStorage → DB ao montar (chamado no layout cliente após login).
 * Idempotente: server deduplica por (user, product) no GET.
 */
export function useSyncRecentlyViewedOnLogin() {
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list: RecentItem[] = JSON.parse(raw);
      if (list.length === 0) return;
      const productIds = list.map(i => i.productId).slice(0, 20);
      void fetch('/api/recently-viewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }),
        keepalive: true,
      }).catch(() => null);
    } catch { /* */ }
  }, []);
}

/**
 * Componente: exibe carrossel de últimos produtos visitados (excluindo currentProductId).
 * Renderiza nada se lista vazia.
 */
export function RecentlyViewed({ currentProductId }: { currentProductId?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: RecentItem[] = raw ? JSON.parse(raw) : [];
      setItems(list.filter(i => i.productId !== currentProductId));
    } catch { setItems([]); }
  }, [currentProductId]);

  if (items.length === 0) return null;

  return (
    <section style={{ padding: '48px 0', borderTop: '1px solid var(--divider)' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Você visitou
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-display)' }}>
          Produtos vistos recentemente
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {items.map(p => (
          <a
            key={p.productId}
            href={`/produtos/${p.slug}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: 12,
              border: '1px solid var(--divider)',
              borderRadius: 4,
              background: 'var(--surface)',
              display: 'block',
            }}
          >
            {p.imageUrl && (
              <div style={{ aspectRatio: '1', marginBottom: 8, overflow: 'hidden', borderRadius: 4 }}>
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</p>
            <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{fmt(p.priceCents)}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
