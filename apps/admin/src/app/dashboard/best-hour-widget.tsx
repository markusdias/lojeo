import { db, behaviorEvents } from '@lojeo/db';
import { and, eq, gte } from 'drizzle-orm';
import { bestSendHour } from '@lojeo/engine';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const WINDOW_DAYS = 30;
const SAMPLE_LIMIT = 5000;

export async function BestHourWidget() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Proxy: comportamento ativo do cliente (page_view, cart_add, etc.)
  // como sinal de horário de engajamento. Email open events idealmente,
  // mas usamos behavior events V1 enquanto não há SDK pixel email.
  const rows = await db
    .select({ createdAt: behaviorEvents.createdAt })
    .from(behaviorEvents)
    .where(and(eq(behaviorEvents.tenantId, TENANT_ID), gte(behaviorEvents.createdAt, since)))
    .limit(SAMPLE_LIMIT);

  const result = bestSendHour(rows.map((r) => ({ openedAt: r.createdAt })));

  // Calcula altura relativa cada bucket pra barras.
  const max = Math.max(...result.histogram, 1);
  const recommendedLabel = `${String(result.bestHour).padStart(2, '0')}h00 (UTC)`;

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
          Hora ideal de envio · últimos {WINDOW_DAYS} dias
        </h2>
        <span className="caption" style={{ color: 'var(--fg-secondary)' }}>
          {result.totalOpens.toLocaleString('pt-BR')} eventos
        </span>
      </header>

      {result.totalOpens === 0 ? (
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          Sem eventos comportamentais nos últimos {WINDOW_DAYS} dias.
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              background: 'var(--bg-subtle)',
              borderRadius: 6,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Recomendado
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display, inherit)',
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'var(--success, #1a8056)',
                  letterSpacing: '-0.02em',
                }}
              >
                {recommendedLabel}
              </div>
            </div>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
              Confiança:{' '}
              <span
                style={{
                  fontWeight: 500,
                  color:
                    result.confidence === 'high'
                      ? 'var(--success)'
                      : result.confidence === 'medium'
                        ? 'var(--accent)'
                        : 'var(--error)',
                }}
              >
                {result.confidence === 'high' ? 'alta' : result.confidence === 'medium' ? 'média' : 'baixa'}
              </span>
              {result.confidence === 'low' && ' — pouca amostra; aguarde mais dados.'}
            </div>
          </div>

          {/* Histogram 24 buckets */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80, marginBottom: 8 }}>
            {result.histogram.map((count, h) => {
              const heightPct = (count / max) * 100;
              const isBest = h === result.bestHour;
              return (
                <div
                  key={h}
                  title={`${String(h).padStart(2, '0')}h: ${count.toLocaleString('pt-BR')} eventos`}
                  style={{
                    flex: 1,
                    height: `${Math.max(2, heightPct)}%`,
                    background: isBest ? 'var(--success, #1a8056)' : 'var(--accent-soft, #e7d8b8)',
                    borderRadius: '2px 2px 0 0',
                    transition: 'background 120ms',
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-muted)' }}>
            <span>00h</span>
            <span>06h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </>
      )}

      <p
        style={{
          marginTop: 'var(--space-3)',
          fontSize: 11,
          color: 'var(--fg-secondary)',
          lineHeight: 1.5,
        }}
      >
        Histograma derivado de eventos comportamentais (page_view, cart_add, etc.) como proxy do horário ativo dos clientes. V2 substituir por opens reais quando email pixel for plugado.
      </p>
    </section>
  );
}
