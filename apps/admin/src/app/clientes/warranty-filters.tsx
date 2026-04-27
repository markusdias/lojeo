'use client';

import { useEffect, useState } from 'react';

interface CustomerWarrantyItem {
  orderId: string;
  orderItemId: string;
  productName: string;
  expiresAt: string | null;
  daysRemaining: number | null;
  status: string;
}

interface CustomerSummary {
  customerEmail: string;
  itemCount: number;
  earliestExpiresAt: string | null;
  items: CustomerWarrantyItem[];
}

const WINDOWS = [30, 60, 90] as const;
type Window = typeof WINDOWS[number];

export function WarrantyFilters() {
  const [active, setActive] = useState<Window | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    if (!active) {
      setSummaries([]);
      return;
    }
    setLoading(true);
    fetch(`/api/customers/warranties-expiring?days=${active}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { customers?: CustomerSummary[] } | null) => {
        setSummaries(data?.customers ?? []);
      })
      .catch(() => setSummaries([]))
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <section
      style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-4)',
        background: 'var(--surface-sunken, #FAF6EE)',
        borderRadius: 8,
        border: '1px solid var(--divider)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14, fontWeight: 500 }}>Garantia expirando em:</strong>
        {WINDOWS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setActive((cur) => (cur === d ? null : d))}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: active === d ? 'var(--text-primary)' : 'var(--surface)',
              color: active === d ? 'var(--text-on-dark, #fff)' : 'var(--text-primary)',
              border: `1px solid ${active === d ? 'var(--text-primary)' : 'var(--divider)'}`,
            }}
          >
            {d}d
          </button>
        ))}
        {active && (
          <button
            type="button"
            onClick={() => setActive(null)}
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            limpar
          </button>
        )}
      </div>

      {loading && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Carregando…</p>}

      {!loading && active && summaries.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Nenhum cliente com garantia expirando nos próximos {active} dias.
        </p>
      )}

      {!loading && summaries.length > 0 && (
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            {summaries.length} cliente{summaries.length === 1 ? '' : 's'} ·{' '}
            {summaries.reduce((s, c) => s + c.itemCount, 0)} item{summaries.reduce((s, c) => s + c.itemCount, 0) === 1 ? '' : 's'}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {summaries.slice(0, 20).map((s) => (
              <li
                key={s.customerEmail}
                style={{
                  padding: '8px 12px',
                  background: 'var(--surface)',
                  borderRadius: 6,
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <a
                  href={`/clientes/${encodeURIComponent(s.customerEmail)}`}
                  style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {s.customerEmail}
                </a>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {s.itemCount} item{s.itemCount === 1 ? '' : 's'} ·{' '}
                  {s.items[0]?.daysRemaining ?? '?'}d até primeiro vencer
                </span>
              </li>
            ))}
          </ul>
          {summaries.length > 20 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              + {summaries.length - 20} cliente{summaries.length - 20 === 1 ? '' : 's'} adicional…
            </p>
          )}
        </div>
      )}
    </section>
  );
}
