import { db, orders } from '@lojeo/db';
import { and, eq, gte, isNotNull, not } from 'drizzle-orm';
import { cohortRetention } from '@lojeo/engine';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const MONTHS_BACK = 6;

export async function CohortWidget() {
  const since = new Date(Date.now() - MONTHS_BACK * 30 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      customerEmail: orders.customerEmail,
      createdAt: orders.createdAt,
      totalCents: orders.totalCents,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, TENANT_ID),
        not(eq(orders.status, 'cancelled')),
        isNotNull(orders.customerEmail),
        gte(orders.createdAt, since),
      ),
    );

  const cohorts = cohortRetention(
    rows.map((r) => ({
      customerEmail: r.customerEmail,
      createdAt: r.createdAt,
      totalCents: r.totalCents,
    })),
    MONTHS_BACK,
  );

  // Calcula offset máximo entre todos cohorts pra alinhar grid.
  const maxOffset = cohorts.length > 0
    ? Math.max(...cohorts.map((c) => c.retentionByOffset.length - 1))
    : 0;

  return (
    <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--space-3)',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', margin: 0 }}>
          Cohort retention · últimos {MONTHS_BACK} meses
        </h2>
        <span className="caption" style={{ color: 'var(--fg-secondary)' }}>
          % clientes recompra por mês
        </span>
      </header>

      {cohorts.length === 0 ? (
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          Sem pedidos nos últimos {MONTHS_BACK} meses.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--space-2)', fontWeight: 500, color: 'var(--fg-secondary)' }}>
                  Cohort
                </th>
                <th style={{ textAlign: 'right', padding: 'var(--space-2)', fontWeight: 500, color: 'var(--fg-secondary)' }}>
                  Tamanho
                </th>
                {Array.from({ length: maxOffset + 1 }, (_, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: 'center',
                      padding: 'var(--space-2)',
                      fontWeight: 500,
                      color: 'var(--fg-secondary)',
                      minWidth: 48,
                    }}
                  >
                    M{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.cohortMonth} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-2)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {c.cohortMonth}
                  </td>
                  <td style={{ padding: 'var(--space-2)', textAlign: 'right', fontWeight: 500 }}>
                    {c.cohortSize}
                  </td>
                  {Array.from({ length: maxOffset + 1 }, (_, i) => {
                    const pct = c.retentionPctByOffset[i];
                    if (pct === undefined) {
                      return (
                        <td
                          key={i}
                          style={{ padding: 'var(--space-2)', textAlign: 'center', color: 'var(--fg-muted)' }}
                        >
                          —
                        </td>
                      );
                    }
                    const bg = i === 0
                      ? 'var(--bg-subtle)'
                      : pct >= 50
                        ? '#1a8056'
                        : pct >= 25
                          ? '#d4a04c'
                          : pct > 0
                            ? '#b94a4a'
                            : 'var(--bg-subtle)';
                    const color = i === 0 || pct === 0 ? 'var(--fg-primary)' : '#fff';
                    return (
                      <td
                        key={i}
                        style={{
                          padding: 'var(--space-2)',
                          textAlign: 'center',
                          background: bg,
                          color,
                          fontWeight: i === 0 ? 600 : 400,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {pct.toFixed(0)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p
        style={{
          marginTop: 'var(--space-3)',
          fontSize: 11,
          color: 'var(--fg-secondary)',
          lineHeight: 1.5,
        }}
      >
        M0 = mês do primeiro pedido (sempre 100%). M1 = clientes que voltaram no mês seguinte. Verde &gt;=50%, amarelo &gt;=25%, vermelho &lt;25%.
      </p>
    </section>
  );
}
