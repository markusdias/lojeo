'use client';

import { useState } from 'react';
import Link from 'next/link';

export type RfmSegment = 'champions' | 'loyal' | 'at_risk' | 'lost' | 'new' | 'promising' | 'other';

export type CustomerRow = {
  email: string;
  orderCount: number;
  totalCents: number;
  daysSinceLastOrder: number;
  segment: RfmSegment;
  rfm: { recency: number; frequency: number; monetary: number };
};

const SEGMENT_LABELS: Record<RfmSegment, string> = {
  champions: 'Campeões', loyal: 'Fiéis', at_risk: 'Em risco',
  lost: 'Perdidos', new: 'Novos', promising: 'Promissores', other: 'Outros',
};

const SEGMENT_COLORS: Record<RfmSegment, string> = {
  champions: 'var(--success)',
  loyal: 'var(--info)',
  at_risk: 'var(--warning)',
  lost: 'var(--error)',
  new: 'var(--accent)',
  promising: 'var(--info)',
  other: 'var(--fg-muted)',
};

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const ALL_SEGMENTS = ['all', 'champions', 'loyal', 'at_risk', 'lost', 'new', 'promising', 'other'] as const;

export function ClientesTable({ customers }: { customers: CustomerRow[] }) {
  const [filter, setFilter] = useState<RfmSegment | 'all'>('all');

  const visible = filter === 'all' ? customers : customers.filter(c => c.segment === filter);

  const counts = customers.reduce<Partial<Record<RfmSegment | 'all', number>>>(
    (acc, c) => ({ ...acc, [c.segment]: (acc[c.segment] ?? 0) + 1 }),
    { all: customers.length }
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {ALL_SEGMENTS.map(seg => {
          const active = filter === seg;
          return (
            <button
              key={seg}
              onClick={() => setFilter(seg)}
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
              {seg !== 'all' && (
                <span aria-hidden style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: SEGMENT_COLORS[seg],
                  display: 'inline-block',
                }} />
              )}
              {seg === 'all' ? 'Todos' : SEGMENT_LABELS[seg]}
              <span className="numeric" style={{ color: active ? 'var(--surface)' : 'var(--fg-secondary)', fontWeight: 'var(--w-regular)' }}>
                {counts[seg] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="lj-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              {['Cliente', 'Segmento', 'Pedidos', 'LTV', 'Último pedido', 'R', 'F', 'M'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(c => (
              <tr key={c.email} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Link href={`/clientes/${encodeURIComponent(c.email)}`} style={{ color: 'var(--fg)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}>
                    {c.email}
                  </Link>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--w-medium)',
                    color: SEGMENT_COLORS[c.segment],
                    background: 'transparent',
                    border: `1px solid ${SEGMENT_COLORS[c.segment]}`,
                  }}>
                    <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: SEGMENT_COLORS[c.segment] }} />
                    {SEGMENT_LABELS[c.segment]}
                  </span>
                </td>
                <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)' }}>{c.orderCount}</td>
                <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)' }}>{fmt(c.totalCents)}</td>
                <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                  {c.daysSinceLastOrder === 0 ? 'hoje' : `${c.daysSinceLastOrder}d atrás`}
                </td>
                <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>{c.rfm.recency}</td>
                <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>{c.rfm.frequency}</td>
                <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>{c.rfm.monetary}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--fg-secondary)' }}>
                  Nenhum cliente neste segmento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
