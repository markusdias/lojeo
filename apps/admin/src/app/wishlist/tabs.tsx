'use client';

import { useState } from 'react';
import { EmptyState, IconHeart, IconGiftCard } from '../../components/ui/empty-state';

export type Tab = 'wishlists' | 'gift-cards' | 'back-in-stock';

interface WishlistRow {
  productId: string;
  productName: string;
  sku: string | null;
  count: number;
  stock: number;
  priceCents: number;
}

interface GiftCardRow {
  code: string;
  initialValueCents: number;
  currentBalanceCents: number;
  recipientEmail: string | null;
  buyerUserId: string | null;
  status: string;
  createdAt: string;
  expiresAt: string | null;
}

interface GiftCardSummary {
  inCirculationCents: number;
  redeemedThisMonthCents: number;
  activeCount: number;
  expiringIn30dCount: number;
}

interface RestockRow {
  productId: string;
  productName: string;
  sku: string | null;
  waiting: number;
  lastSignupAt: string | null;
}

interface Props {
  initialTab: Tab;
  totals: { wishlists: number; giftcards: number; backstock: number };
  wishlists: WishlistRow[];
  giftcards: GiftCardRow[];
  giftcardsSummary: GiftCardSummary;
  restock: RestockRow[];
}

function fmtBrl(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMin = (Date.now() - d.getTime()) / 60000;
  if (diffMin < 60) return `há ${Math.max(1, Math.round(diffMin))} min`;
  const diffH = diffMin / 60;
  if (diffH < 24) return `há ${Math.round(diffH)} h`;
  const diffD = diffH / 24;
  if (diffD < 30) return `há ${Math.round(diffD)} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  partial: 'Parcial',
  used: 'Resgatado',
  expired: 'Expirado',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'lj-badge-success',
  partial: 'lj-badge-warning',
  used: 'lj-badge-neutral',
  expired: 'lj-badge-error',
};

function inferStatus(g: GiftCardRow): string {
  if (g.status === 'used' || g.currentBalanceCents === 0) return 'used';
  if (g.expiresAt && new Date(g.expiresAt) < new Date()) return 'expired';
  if (g.currentBalanceCents < g.initialValueCents) return 'partial';
  return 'active';
}

export function WishlistTabs({ initialTab, totals, wishlists, giftcards, giftcardsSummary, restock }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const TABS: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'wishlists', label: 'Wishlists ativas', count: totals.wishlists },
    { key: 'gift-cards', label: 'Gift cards', count: totals.giftcards },
    { key: 'back-in-stock', label: 'Back-in-stock', count: totals.backstock },
  ];

  return (
    <div>
      {/* Tab strip */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        borderBottom: '1px solid var(--border)',
        marginBottom: 'var(--space-5)',
        flexWrap: 'wrap',
      }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 'var(--space-2) 0',
                borderBottom: active ? '2px solid var(--fg)' : '2px solid transparent',
                marginBottom: -1,
                fontSize: 'var(--text-body-s)',
                fontWeight: active ? 'var(--w-semibold)' : 'var(--w-medium)',
                color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {t.label}
              <span className="numeric" style={{
                fontSize: 'var(--text-caption)',
                color: active ? 'var(--accent)' : 'var(--fg-muted)',
                background: active ? 'var(--accent-soft)' : 'var(--neutral-50)',
                padding: '1px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 'var(--w-medium)',
              }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* WISHLISTS TAB */}
      {tab === 'wishlists' && (
        <div className="lj-card" style={{ overflow: 'hidden' }}>
          {wishlists.length === 0 ? (
            <div style={{ padding: 'var(--space-8)' }}>
              <EmptyState
                icon={<IconHeart />}
                title="Nenhuma wishlist registrada"
                description="Quando clientes salvarem produtos como favoritos no storefront, eles aparecem aqui ranqueados por demanda. Use para priorizar reposição e campanha."
                action={{ label: 'Ver produtos', href: '/products' }}
              />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>PRODUTO</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>EM WISHLIST</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>ESTOQUE</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>PREÇO</th>
                  <th style={{ width: 130, padding: 'var(--space-3) var(--space-4)' }}></th>
                </tr>
              </thead>
              <tbody>
                {wishlists.map(w => (
                  <tr key={w.productId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--neutral-100)' }} />
                        <div>
                          <p style={{ fontWeight: 'var(--w-medium)' }}>{w.productName}</p>
                          <p className="caption mono">{w.sku ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{w.count}</span>
                      <span className="caption" style={{ marginLeft: 4 }}>pessoas</span>
                    </td>
                    <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      {w.stock === 0 ? (
                        <span className="lj-badge lj-badge-error">
                          <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 4 }} />
                          Zerado
                        </span>
                      ) : (
                        <span style={{ color: w.stock <= 6 ? 'var(--warning)' : 'var(--fg)' }}>{w.stock}</span>
                      )}
                    </td>
                    <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 'var(--w-medium)' }}>
                      {fmtBrl(w.priceCents)}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="lj-btn-secondary"
                        style={{ fontSize: 'var(--text-caption)', padding: '6px 12px' }}
                        disabled
                        title="Detalhe da lista por produto — Sprint 9"
                      >
                        Ver lista →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* GIFT CARDS TAB */}
      {tab === 'gift-cards' && (
        <div>
          {/* 4 metric cards summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
              <p className="caption">Em circulação</p>
              <p className="numeric" style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', marginTop: 4 }}>
                {fmtBrl(giftcardsSummary.inCirculationCents)}
              </p>
            </div>
            <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
              <p className="caption">Resgatados (mês)</p>
              <p className="numeric" style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', marginTop: 4 }}>
                {fmtBrl(giftcardsSummary.redeemedThisMonthCents)}
              </p>
            </div>
            <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
              <p className="caption">Cards ativos</p>
              <p className="numeric" style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', marginTop: 4 }}>
                {giftcardsSummary.activeCount}
              </p>
            </div>
            <div className="lj-card" style={{ padding: 'var(--space-4)', background: 'var(--warning-soft)', borderColor: 'var(--warning)' }}>
              <p className="caption" style={{ color: 'var(--warning)' }}>Expirando em 30d</p>
              <p className="numeric" style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', marginTop: 4, color: 'var(--warning)' }}>
                {giftcardsSummary.expiringIn30dCount}
              </p>
            </div>
          </div>

          {/* Cards table */}
          <div className="lj-card" style={{ overflow: 'hidden' }}>
            {giftcards.length === 0 ? (
              <div style={{ padding: 'var(--space-8)' }}>
                <EmptyState
                  icon={<IconGiftCard />}
                  title="Nenhum gift card emitido"
                  description="Vendas como produto especial no storefront viram gift cards aqui automaticamente. Você também pode emitir manualmente para presentes corporativos."
                  action={{ label: 'Vender vale-presente', href: 'https://apps-lojeo-storefront.m9axtw.easypanel.host/presente' }}
                />
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>CÓDIGO</th>
                    <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>VALOR</th>
                    <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>SALDO</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>COMPRADOR</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>DESTINATÁRIO</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>EMITIDO</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {giftcards.map(g => {
                    const st = inferStatus(g);
                    return (
                      <tr key={g.code} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)' }}>{g.code}</td>
                        <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{fmtBrl(g.initialValueCents)}</td>
                        <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 'var(--w-medium)' }}>{fmtBrl(g.currentBalanceCents)}</td>
                        <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontSize: 'var(--text-caption)' }}>
                          {g.buyerUserId ? g.buyerUserId.slice(0, 8) : '—'}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>{g.recipientEmail ?? '—'}</td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                          {new Date(g.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <span className={`lj-badge ${STATUS_BADGE[st] ?? 'lj-badge-neutral'}`}>
                            <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 4 }} />
                            {STATUS_LABELS[st] ?? st}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* BACK-IN-STOCK TAB */}
      {tab === 'back-in-stock' && (
        <div className="lj-card" style={{ overflow: 'hidden' }}>
          {restock.length === 0 ? (
            <div style={{ padding: 'var(--space-8)' }}>
              <EmptyState
                icon={<IconHeart />}
                title="Ninguém esperando reposição"
                description="Quando clientes clicarem em “avise-me quando voltar” em produtos esgotados, a fila aparece aqui. Use para priorizar reposição com demanda confirmada."
                action={{ label: 'Ver estoque', href: '/inventory' }}
              />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>PRODUTO</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>ESPERANDO</th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>ÚLTIMO CADASTRO</th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>REPOSIÇÃO</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {restock.map(r => (
                  <tr key={r.productId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--neutral-100)' }} />
                        <div>
                          <p style={{ fontWeight: 'var(--w-medium)' }}>{r.productName}</p>
                          <p className="caption mono">{r.sku ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{r.waiting}</span>
                      <span className="caption" style={{ marginLeft: 4 }}>clientes</span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                      {relativeTime(r.lastSignupAt)}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontSize: 'var(--text-caption)' }}>
                      sem reposição agendada
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="lj-btn-primary"
                        style={{ fontSize: 'var(--text-caption)', padding: '6px 12px' }}
                        disabled
                        title="Disparo via Trigger.dev quando inventário > 0 — Sprint 9"
                      >
                        Notificar todos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
