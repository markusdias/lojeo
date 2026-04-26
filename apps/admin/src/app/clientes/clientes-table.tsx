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
  champions: '#16a34a', loyal: '#2563eb', at_risk: '#d97706',
  lost: '#dc2626', new: '#7c3aed', promising: '#0891b2', other: '#6b7280',
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {ALL_SEGMENTS.map(seg => (
          <button
            key={seg}
            onClick={() => setFilter(seg)}
            style={{
              padding: '4px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
              border: filter === seg ? 'none' : '1px solid #374151',
              background: filter === seg ? (seg === 'all' ? '#374151' : SEGMENT_COLORS[seg]) : 'transparent',
              color: filter === seg ? '#fff' : '#9ca3af',
              fontWeight: filter === seg ? 600 : 400,
            }}
          >
            {seg === 'all' ? 'Todos' : SEGMENT_LABELS[seg]} ({counts[seg] ?? 0})
          </button>
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1f2937' }}>
            {['Cliente', 'Segmento', 'Pedidos', 'LTV', 'Último pedido', 'R', 'F', 'M'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map(c => (
            <tr key={c.email} style={{ borderBottom: '1px solid #111827' }}>
              <td style={{ padding: '10px 12px' }}>
                <Link href={`/clientes/${encodeURIComponent(c.email)}`} style={{ color: '#e5e7eb', textDecoration: 'none', fontWeight: 500 }}>
                  {c.email}
                </Link>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: SEGMENT_COLORS[c.segment] + '22', color: SEGMENT_COLORS[c.segment] }}>
                  {SEGMENT_LABELS[c.segment]}
                </span>
              </td>
              <td style={{ padding: '10px 12px', color: '#d1d5db' }}>{c.orderCount}</td>
              <td style={{ padding: '10px 12px', color: '#d1d5db' }}>{fmt(c.totalCents)}</td>
              <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{c.daysSinceLastOrder === 0 ? 'hoje' : `${c.daysSinceLastOrder}d atrás`}</td>
              <td style={{ padding: '10px 12px', color: '#6b7280' }}>{c.rfm.recency}</td>
              <td style={{ padding: '10px 12px', color: '#6b7280' }}>{c.rfm.frequency}</td>
              <td style={{ padding: '10px 12px', color: '#6b7280' }}>{c.rfm.monetary}</td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#4b5563' }}>
                Nenhum cliente neste segmento.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
