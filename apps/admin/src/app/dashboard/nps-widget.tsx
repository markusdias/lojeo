import { db, npsResponses } from '@lojeo/db';
import { and, eq, gte, desc } from 'drizzle-orm';
import { computeNps } from '@lojeo/engine';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const WINDOW_DAYS = 90;

export async function NpsWidget() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const all = await db
    .select({
      score: npsResponses.score,
      comment: npsResponses.comment,
      customerEmail: npsResponses.customerEmail,
      surveyTrigger: npsResponses.surveyTrigger,
      createdAt: npsResponses.createdAt,
    })
    .from(npsResponses)
    .where(and(eq(npsResponses.tenantId, TENANT_ID), gte(npsResponses.createdAt, since)))
    .orderBy(desc(npsResponses.createdAt))
    .limit(200);

  const summary = computeNps(all.map((r) => ({ score: r.score })));
  const recentWithComments = all.filter((r) => r.comment && r.comment.trim().length > 0).slice(0, 3);

  // NPS gauge color
  const npsColor = summary.nps >= 50
    ? 'var(--success, #1a8056)'
    : summary.nps >= 0
      ? 'var(--accent, #d4a04c)'
      : 'var(--error, #b94a4a)';

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
          NPS · últimos {WINDOW_DAYS} dias
        </h2>
        <span className="caption" style={{ color: 'var(--fg-secondary)' }}>
          {summary.total} resposta{summary.total === 1 ? '' : 's'}
        </span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-5)', alignItems: 'center' }}>
        {/* Gauge */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--font-display, inherit)',
              fontSize: 56,
              fontWeight: 600,
              lineHeight: 1,
              color: npsColor,
              letterSpacing: '-0.02em',
            }}
          >
            {summary.total > 0 ? summary.nps : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            NPS
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Breakdown label="Promoters (9-10)" count={summary.promoters} total={summary.total} color="#1a8056" />
          <Breakdown label="Passives (7-8)" count={summary.passives} total={summary.total} color="#d4a04c" />
          <Breakdown label="Detractors (0-6)" count={summary.detractors} total={summary.total} color="#b94a4a" />
        </div>
      </div>

      {recentWithComments.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Comentários recentes
          </p>
          {recentWithComments.map((r, idx) => (
            <div key={idx} style={{ marginBottom: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 500, color: r.score >= 9 ? '#1a8056' : r.score >= 7 ? '#d4a04c' : '#b94a4a' }}>
                  {r.score}/10
                </span>
                <span style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>
                  {r.customerEmail ? r.customerEmail.split('@')[0] : 'anônimo'}
                </span>
              </div>
              <p style={{ color: 'var(--fg-secondary)', lineHeight: 1.4, margin: 0 }}>
                &quot;{r.comment}&quot;
              </p>
            </div>
          ))}
        </div>
      )}

      {summary.total === 0 && (
        <p
          style={{
            marginTop: 'var(--space-3)',
            fontSize: 13,
            color: 'var(--fg-secondary)',
            lineHeight: 1.5,
          }}
        >
          Sem respostas ainda. Survey é enviado automaticamente 7 dias após entrega via cron daily.
        </p>
      )}
    </section>
  );
}

function Breakdown({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--fg-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 500 }}>{count}</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}
