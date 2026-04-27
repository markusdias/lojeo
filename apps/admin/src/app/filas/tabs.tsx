'use client';

import Link from 'next/link';
import { useState } from 'react';

export type Tab = 'reviews' | 'returns' | 'shipping';

export interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  customerName: string | null;
  productId: string;
  verified: boolean;
  createdAt: string;
}

export interface ReturnRow {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  type: string;
  reason: string;
  status: string;
  totalCents: number;
  createdAt: string;
}

export interface ShippingRow {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  city: string;
  method: string;
  slaText: string;
  overdue: boolean;
  totalCents: number;
  createdAt: string;
}

interface Props {
  initialTab: Tab;
  counts: { reviews: number; returns: number; shipping: number };
  reviews: ReviewRow[];
  returns: ReturnRow[];
  shipping: ShippingRow[];
}

const RETURN_STEPS = [
  { key: 'requested', label: 'Solicitada' },
  { key: 'analyzing', label: 'Em análise' },
  { key: 'approved', label: 'Aprovada' },
  { key: 'awaiting_product', label: 'Aguardando produto' },
  { key: 'received', label: 'Recebida' },
  { key: 'finalized', label: 'Finalizada' },
];

function fmtBrl(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMin = (Date.now() - d.getTime()) / 60000;
  if (diffMin < 60) return `há ${Math.max(1, Math.round(diffMin))} min`;
  const diffH = diffMin / 60;
  if (diffH < 24) return `há ${Math.round(diffH)} h`;
  const diffD = diffH / 24;
  if (diffD < 30) return `há ${Math.round(diffD)} dias`;
  return d.toLocaleDateString('pt-BR');
}

function Stars({ value }: { value: number }) {
  return (
    <span style={{ color: '#C9A85C', letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= value ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

export function QueuesTabs({ initialTab, counts, reviews, returns, shipping }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const TABS: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'reviews', label: 'Avaliações', count: counts.reviews },
    { key: 'returns', label: 'Trocas e devoluções', count: counts.returns },
    { key: 'shipping', label: 'Pendentes de envio', count: counts.shipping },
  ];

  return (
    <div>
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

      {tab === 'reviews' && <ReviewsList reviews={reviews} />}
      {tab === 'returns' && <ReturnsList returns={returns} />}
      {tab === 'shipping' && <ShippingList shipping={shipping} />}
    </div>
  );
}

function ReviewsList({ reviews }: { reviews: ReviewRow[] }) {
  if (reviews.length === 0) {
    return (
      <div className="lj-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          Nenhuma avaliação pendente. Se aparecer, você revisa por aqui antes de publicar no produto.
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {reviews.map(r => (
        <div key={r.id} className="lj-card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Stars value={r.rating} />
            {r.verified && (
              <span className="lj-badge lj-badge-success">
                <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 4 }} />
                Compra verificada
              </span>
            )}
            <span className="caption" style={{ color: 'var(--fg-muted)' }}>{relativeTime(r.createdAt)}</span>
            {r.customerName && (
              <span className="caption" style={{ color: 'var(--fg-secondary)' }}>· {r.customerName}</span>
            )}
          </div>
          {r.title && (
            <p style={{ fontWeight: 'var(--w-semibold)', fontSize: 'var(--text-body-s)', marginBottom: 4 }}>{r.title}</p>
          )}
          {r.body && (
            <p className="body-s" style={{ color: 'var(--fg-secondary)', lineHeight: 1.6 }}>{r.body}</p>
          )}
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
            <Link href="/avaliacoes" className="lj-btn-primary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px', textDecoration: 'none' }}>
              Aprovar
            </Link>
            <Link href="/avaliacoes" className="lj-btn-secondary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px', textDecoration: 'none' }}>
              Rejeitar
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReturnsList({ returns }: { returns: ReturnRow[] }) {
  if (returns.length === 0) {
    return (
      <div className="lj-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          Nenhuma devolução em curso. Aparece aqui assim que cliente abrir solicitação.
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {returns.map(r => {
        const stepIdx = RETURN_STEPS.findIndex(s => s.key === r.status);
        return (
          <div key={r.id} className="lj-card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <span className="mono" style={{ fontWeight: 'var(--w-semibold)' }}>#{r.orderNumber}</span>
                <span className="body-s" style={{ color: 'var(--fg-secondary)' }}>{r.customerEmail ?? '—'}</span>
                <span className="body-s">· {r.reason}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <span className="caption" style={{ color: 'var(--fg-muted)' }}>aberta {relativeTime(r.createdAt)}</span>
                <span className="numeric" style={{ fontWeight: 'var(--w-semibold)' }}>{fmtBrl(r.totalCents)}</span>
              </div>
            </div>
            {/* Timeline horizontal 6 steps */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              {RETURN_STEPS.map((s, i) => {
                const done = i < stepIdx;
                const current = i === stepIdx;
                const pending = i > stepIdx;
                const color = done ? 'var(--success)' : current ? 'var(--accent)' : 'var(--fg-muted)';
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: done || current ? color : 'transparent',
                      border: `1.5px solid ${color}`,
                      color: done || current ? '#fff' : color,
                      fontSize: 11,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 600,
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < RETURN_STEPS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: i < stepIdx ? 'var(--success)' : 'var(--border)', margin: '0 4px' }} />
                    )}
                    <span className="caption" style={{
                      color: pending ? 'var(--fg-muted)' : 'var(--fg)',
                      whiteSpace: 'nowrap',
                      marginLeft: 4,
                      fontWeight: current ? 'var(--w-semibold)' : 'var(--w-regular)',
                    }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <Link href="/devolucoes" className="lj-btn-secondary" style={{ textDecoration: 'none', fontSize: 'var(--text-caption)' }}>
          Ver todas em /devolucoes →
        </Link>
      </div>
    </div>
  );
}

function ShippingList({ shipping }: { shipping: ShippingRow[] }) {
  if (shipping.length === 0) {
    return (
      <div className="lj-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          Nenhum pedido aguardando envio. Pedidos pagos ficam aqui até serem despachados.
        </p>
      </div>
    );
  }
  const overdueCnt = shipping.filter(s => s.overdue).length;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span className="caption" style={{ color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>Filtrar:</span>
        <span className="lj-badge lj-badge-accent">Todos · {shipping.length}</span>
        {overdueCnt > 0 && <span className="lj-badge lj-badge-error">Atrasados · {overdueCnt}</span>}
      </div>
      <div className="lj-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>PEDIDO</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>CLIENTE</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>DESTINO</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>MÉTODO</th>
              <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>PRAZO</th>
              <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {shipping.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Link href={`/pedidos/${o.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}>
                    #{o.orderNumber}
                  </Link>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{o.customerEmail ?? '—'}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>{o.city}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{o.method}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <span className={`lj-badge ${o.overdue ? 'lj-badge-error' : 'lj-badge-neutral'}`}>
                    <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 4 }} />
                    {o.slaText}
                  </span>
                </td>
                <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 'var(--w-medium)' }}>
                  {fmtBrl(o.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
