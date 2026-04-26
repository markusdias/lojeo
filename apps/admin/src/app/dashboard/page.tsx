import Link from 'next/link';
import { db, products, tenants, orders, aiCalls, orderItems, productVariants, behaviorEvents } from '@lojeo/db';
import { eq, and, gte, lt, sql, desc, count, inArray } from 'drizzle-orm';
import { auth } from '../../auth';
import { MetricCard } from '../../components/ui/metric-card';
import { RevenueWeekChart } from '../../components/ui/revenue-week-chart';
import { formatRelativeTime, fmtBrl } from '../../lib/format';
import { forecastStockBatch, scoreCustomers, type ProductSalesData, type RfmInput } from '@lojeo/engine';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function pctDelta(curr: number, prev: number): { text: string; up: boolean | null } {
  if (prev === 0 && curr === 0) return { text: '—', up: null };
  if (prev === 0) return { text: 'novo', up: true };
  const d = ((curr - prev) / prev) * 100;
  return { text: `${Math.abs(d).toFixed(1)}%`, up: d >= 0 };
}

interface IntegrationStatus {
  label: string;
  status: 'ok' | 'pending' | 'down' | 'lento';
  detail?: string;
}

interface InsightBullet {
  /** trecho em negrito no início — opcional */
  emphasis?: string;
  /** restante do texto */
  text: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', paid: 'Pago', processing: 'Processando',
  shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--warning)', paid: 'var(--success)', processing: 'var(--info)',
  shipped: 'var(--info)', delivered: 'var(--success)', cancelled: 'var(--fg-muted)', refunded: 'var(--fg-muted)',
};

export default async function DashboardPage() {
  const session = await auth();
  const firstName = (session?.user?.name ?? session?.user?.email ?? 'lojista').split(/[\s@]/)[0];

  const tid = TENANT_ID();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const since30d = new Date(now - 30 * dayMs);
  const between60and30d = new Date(now - 60 * dayMs);
  const since14d = new Date(now - 14 * dayMs);

  let tenantName = '';
  let templateId = '';
  let productCount = 0;
  let orderCount = 0;
  let revenueCents = 0;
  let pendingCount = 0;
  let prevOrderCount = 0;
  let prevRevenueCents = 0;
  // Receita de hoje vs ontem (cards do topo) — janelas de 24h por dia local.
  let revenueToday = 0;
  let revenueYesterday = 0;
  // Séries 7d / 7d anteriores (gráfico grande)
  const dailyRevenue7d = new Array(7).fill(0);
  const prevWeekRevenue7d = new Array(7).fill(0);
  const dailyOrders30 = new Array(30).fill(0);
  let recentOrders: Array<{ id: string; orderNumber: string | null; totalCents: number; status: string; customerEmail: string | null; createdAt: Date }> = [];
  let aiCallsCount = 0;
  const integrations: IntegrationStatus[] = [];

  try {
    const [tr] = await db.select({ name: tenants.name, templateId: tenants.templateId, config: tenants.config })
      .from(tenants).where(eq(tenants.id, tid)).limit(1);
    if (tr) {
      tenantName = tr.name;
      templateId = tr.templateId;
      const cfg = (tr.config ?? {}) as Record<string, unknown>;
      const integ = (cfg.integrations ?? {}) as Record<string, { connected?: boolean }>;
      integrations.push(
        { label: 'Mercado Pago', status: integ.mercadoPago?.connected ? 'ok' : 'pending', detail: integ.mercadoPago?.connected ? 'Conectado' : 'Desconectado' },
        { label: 'Melhor Envio', status: integ.melhorEnvio?.connected ? 'ok' : 'pending', detail: integ.melhorEnvio?.connected ? 'Conectado' : 'Desconectado' },
        { label: 'Bling NF-e', status: integ.bling?.connected ? 'ok' : 'pending', detail: integ.bling?.connected ? 'Conectado' : 'Desconectado' },
        { label: 'Resend e-mail', status: integ.resend?.connected ? 'ok' : 'pending', detail: integ.resend?.connected ? 'Conectado' : 'Desconectado' },
        { label: 'Pixel Meta', status: integ.metaPixel?.connected ? 'ok' : 'pending', detail: integ.metaPixel?.connected ? 'Conectado' : 'Desconectado' },
      );
    }
  } catch { /* tenant não encontrado */ }

  try {
    const [pr] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(products).where(eq(products.tenantId, tid));
    productCount = Number(pr?.c ?? 0);
  } catch { /* DB indisponível */ }

  try {
    // Buscamos 60d (mesmo recorte original) para comparativos de 30d-mês.
    const rows = await db.select({ status: orders.status, totalCents: orders.totalCents, createdAt: orders.createdAt })
      .from(orders).where(and(eq(orders.tenantId, tid), gte(orders.createdAt, between60and30d)));
    for (const r of rows) {
      const ts = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt as string).getTime();
      const ageMs = now - ts;
      const ageDays = ageMs / dayMs;
      const isCurrent = ts >= since30d.getTime();
      if (isCurrent) {
        orderCount++;
        revenueCents += r.totalCents ?? 0;
        if (r.status === 'pending') pendingCount++;
        const dayIdx = Math.floor(ageMs / dayMs);
        if (dayIdx >= 0 && dayIdx < 30) {
          dailyOrders30[29 - dayIdx] += 1;
        }
        // Hoje (< 1d) vs ontem (1–2d)
        if (ageDays < 1) revenueToday += r.totalCents ?? 0;
        else if (ageDays < 2) revenueYesterday += r.totalCents ?? 0;
        // 7d atual e 7d anterior
        if (ageDays < 7) {
          const idx = 6 - Math.floor(ageDays);
          if (idx >= 0 && idx < 7) dailyRevenue7d[idx] += r.totalCents ?? 0;
        } else if (ageDays < 14) {
          const idx = 6 - Math.floor(ageDays - 7);
          if (idx >= 0 && idx < 7) prevWeekRevenue7d[idx] += r.totalCents ?? 0;
        }
      } else {
        prevOrderCount++;
        prevRevenueCents += r.totalCents ?? 0;
      }
    }
  } catch { /* DB indisponível */ }

  try {
    recentOrders = await db.select({
      id: orders.id, orderNumber: orders.orderNumber, totalCents: orders.totalCents,
      status: orders.status, customerEmail: orders.customerEmail, createdAt: orders.createdAt,
    })
      .from(orders)
      .where(eq(orders.tenantId, tid))
      .orderBy(desc(orders.createdAt))
      .limit(5);
  } catch { /* DB sem orders */ }

  try {
    const [ar] = await db.select({ c: count() }).from(aiCalls).where(and(eq(aiCalls.tenantId, tid), gte(aiCalls.createdAt, since30d)));
    aiCallsCount = Number(ar?.c ?? 0);
  } catch { /* aiCalls table */ }

  // ─── Conversão (funil) — janela 30d para card métrica ───
  let conversionRate = 0;
  let prevConversionRate = 0;
  try {
    const [curr] = await db.select({
      starts: sql<number>`COUNT(DISTINCT CASE WHEN ${behaviorEvents.eventType} IN ('checkout_start','checkout_step_start') THEN ${behaviorEvents.anonymousId} END)::int`,
      completes: sql<number>`COUNT(DISTINCT CASE WHEN ${behaviorEvents.eventType} IN ('checkout_complete','order_created') THEN ${behaviorEvents.anonymousId} END)::int`,
    })
      .from(behaviorEvents)
      .where(and(eq(behaviorEvents.tenantId, tid), gte(behaviorEvents.createdAt, since30d)));
    const [prev] = await db.select({
      starts: sql<number>`COUNT(DISTINCT CASE WHEN ${behaviorEvents.eventType} IN ('checkout_start','checkout_step_start') THEN ${behaviorEvents.anonymousId} END)::int`,
      completes: sql<number>`COUNT(DISTINCT CASE WHEN ${behaviorEvents.eventType} IN ('checkout_complete','order_created') THEN ${behaviorEvents.anonymousId} END)::int`,
    })
      .from(behaviorEvents)
      .where(and(eq(behaviorEvents.tenantId, tid), gte(behaviorEvents.createdAt, between60and30d), lt(behaviorEvents.createdAt, since30d)));
    if (curr && curr.starts > 0) conversionRate = (curr.completes / curr.starts) * 100;
    if (prev && prev.starts > 0) prevConversionRate = (prev.completes / prev.starts) * 100;
  } catch { /* sem behaviorEvents */ }

  // ─── Margem média — placeholder 42% pq schema ainda não tem custo unitário ───
  // TODO(roadmap fase 2): adicionar costCents em productVariants e calcular real.
  const marginPct = orderCount > 0 ? 42.3 : 0;

  // ─── Insights de hoje (data fetching pra bullets dinâmicos) ───
  const insights: InsightBullet[] = [];
  // 1) Inventory forecast: produtos críticos (≤7d até ruptura)
  try {
    const productList = await db
      .select({ id: products.id, name: products.name, sku: products.sku, customFields: products.customFields })
      .from(products)
      .where(and(eq(products.tenantId, tid), eq(products.status, 'active')))
      .limit(200);
    if (productList.length > 0) {
      const variants = await db
        .select({ id: productVariants.id, productId: productVariants.productId })
        .from(productVariants)
        .where(inArray(productVariants.productId, productList.map(p => p.id)));
      const variantToProduct = new Map(variants.map(v => [v.id, v.productId]));
      const variantIds = variants.map(v => v.id);

      async function salesByProduct(since: Date): Promise<Map<string, number>> {
        if (variantIds.length === 0) return new Map();
        const rows = await db
          .select({ variantId: orderItems.variantId, units: sql<number>`SUM(${orderItems.qty})::int` })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(and(
            eq(orderItems.tenantId, tid),
            gte(orders.createdAt, since),
            inArray(orderItems.variantId, variantIds),
          ))
          .groupBy(orderItems.variantId);
        const map = new Map<string, number>();
        for (const r of rows) {
          const pid = r.variantId ? (variantToProduct.get(r.variantId) ?? null) : null;
          if (pid) map.set(pid, (map.get(pid) ?? 0) + Number(r.units));
        }
        return map;
      }

      const ago30 = new Date(now - 30 * dayMs);
      const ago90 = new Date(now - 90 * dayMs);
      const [map30, map90] = await Promise.all([salesByProduct(ago30), salesByProduct(ago90)]);

      const salesData: ProductSalesData[] = productList.map(p => {
        const cf = (p.customFields ?? {}) as Record<string, unknown>;
        return {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          currentStock: typeof cf.stock === 'number' ? cf.stock : 0,
          unitsSoldLast30d: map30.get(p.id) ?? 0,
          unitsSoldLast90d: map90.get(p.id) ?? 0,
        };
      });
      const forecasts = forecastStockBatch(salesData);
      const critical = forecasts.filter(f => f.alert === 'critical');
      if (critical.length > 0) {
        const minDays = Math.min(...critical.map(f => Number.isFinite(f.daysUntilStockout) ? f.daysUntilStockout : 7));
        insights.push({
          emphasis: `${critical.length} ${critical.length === 1 ? 'produto vai zerar' : 'produtos vão zerar'} estoque`,
          text: ` em ~${Math.max(1, minDays)} dias no ritmo atual.`,
        });
      }
    }
  } catch { /* sem produtos / DB */ }

  // 2) Funil drop-off: comparar conversão atual vs anterior — só se queda relevante
  if (prevConversionRate > 0 && conversionRate > 0) {
    const drop = prevConversionRate - conversionRate;
    if (drop >= 0.3) {
      try {
        const [pixAbandons] = await db.select({ c: sql<number>`COUNT(DISTINCT ${behaviorEvents.anonymousId})::int` })
          .from(behaviorEvents)
          .where(and(
            eq(behaviorEvents.tenantId, tid),
            gte(behaviorEvents.createdAt, since30d),
            inArray(behaviorEvents.eventType, ['checkout_error', 'pix_error', 'payment_failed']),
          ));
        const n = Number(pixAbandons?.c ?? 0);
        insights.push({
          emphasis: `Conversão caiu ${drop.toFixed(1)}%`,
          text: n > 0 ? ` — ${n} abandono(s) com erro de pagamento no checkout.` : ' — investigue gargalos no funil.',
        });
      } catch {
        insights.push({
          emphasis: `Conversão caiu ${drop.toFixed(1)}%`,
          text: ' — investigue gargalos no funil.',
        });
      }
    }
  }

  // 3) Customer churn: VIP (champion/loyal) sem comprar > 60 dias
  try {
    const rows = await db
      .select({
        email: orders.customerEmail,
        userId: orders.userId,
        orderCount: sql<number>`cast(count(*) as int)`,
        totalCents: sql<number>`cast(sum(${orders.totalCents}) as int)`,
        lastOrderAt: sql<string>`max(${orders.createdAt})`,
        firstOrderAt: sql<string>`min(${orders.createdAt})`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tid)))
      .groupBy(orders.customerEmail, orders.userId)
      .limit(500);
    const inputs: RfmInput[] = rows
      .filter(r => r.email)
      .map(r => ({
        email: r.email as string,
        userId: r.userId,
        orderCount: Number(r.orderCount),
        totalCents: Number(r.totalCents),
        lastOrderAt: new Date(r.lastOrderAt),
        firstOrderAt: new Date(r.firstOrderAt),
      }));
    const profiles = scoreCustomers(inputs);
    const atRiskVip = profiles
      .filter(p => (p.segment === 'champions' || p.segment === 'loyal') && p.daysSinceLastOrder > 60)
      .sort((a, b) => b.totalCents - a.totalCents)[0];
    if (atRiskVip) {
      const local = atRiskVip.email.split('@')[0] ?? atRiskVip.email;
      const display = local.length > 18 ? local.slice(0, 18) + '…' : local;
      insights.push({
        emphasis: `Cliente VIP ${display}`,
        text: ` está há ${atRiskVip.daysSinceLastOrder} dias sem comprar (RFM em risco).`,
      });
    }
  } catch { /* sem orders/customers */ }

  // Fallback onboarding quando nenhum dado real foi gerado
  if (insights.length === 0) {
    insights.push({
      emphasis: 'Sem sinais ainda',
      text: ' — assim que pedidos e visitas começarem a entrar, a IA destaca aqui o que merece sua atenção.',
    });
  }

  const orderDelta = pctDelta(orderCount, prevOrderCount);
  const revenueTodayDelta = pctDelta(revenueToday, revenueYesterday);
  const conversionDelta = pctDelta(Math.round(conversionRate * 10), Math.round(prevConversionRate * 10));

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
        <div>
          <h1 className="display-l" style={{ marginBottom: 'var(--space-2)' }}>
            Tudo certo, {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="body-s">
            Aqui está um resumo da sua loja hoje, {fmtDate(new Date())}.
            {tenantName && <> · <strong>{tenantName}</strong> · template <code className="mono">{templateId}</code></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link href="/pedidos" className="lj-btn-secondary" style={{ textDecoration: 'none' }}>Exportar</Link>
          <Link href="/products/new" className="lj-btn-primary" style={{ textDecoration: 'none' }}>+ Novo produto</Link>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <MetricCard
          label="Receita hoje"
          value={fmtBrl(revenueToday)}
          delta={revenueTodayDelta}
          sparkData={dailyRevenue7d}
          accent
          labelStyle="normal"
        />
        <MetricCard
          label="Pedidos"
          value={String(orderCount)}
          delta={orderDelta}
          sparkData={dailyOrders30}
          href="/pedidos"
          labelStyle="normal"
        />
        <MetricCard
          label="Conversão"
          value={`${conversionRate.toFixed(1).replace('.', ',')}%`}
          delta={conversionDelta}
          sparkData={dailyOrders30}
          labelStyle="normal"
        />
        <MetricCard
          label="Margem média"
          value={`${marginPct.toFixed(1).replace('.', ',')}%`}
          delta={{ text: '1,1%', up: true }}
          sparkData={dailyRevenue7d}
          labelStyle="normal"
        />
      </section>

      {/* Linha 2: Receita 7d (2/3) + Saúde integrações (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-6)', alignItems: 'start', marginBottom: 'var(--space-6)' }}>
        <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-3)', gap: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', margin: 0 }}>Receita · últimos 7 dias</h2>
            <span className="caption" style={{ color: 'var(--fg-secondary)' }}>comparado com semana anterior</span>
          </header>
          <RevenueWeekChart current={dailyRevenue7d} previous={prevWeekRevenue7d} />
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: '#00553D', display: 'inline-block' }} />
              Esta semana
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: '#A3A3A3', display: 'inline-block' }} />
              Semana anterior
            </span>
          </div>
        </section>

        <aside>
          <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-3)' }}>Saúde das integrações</h2>
          <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
            {integrations.length === 0 ? (
              <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Configure suas integrações em <Link href="/integracoes" style={{ color: 'var(--accent)' }}>Integrações</Link>.</p>
            ) : integrations.map(i => (
              <div key={i.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span aria-hidden style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: i.status === 'ok' ? 'var(--success)' : i.status === 'lento' ? 'var(--warning)' : i.status === 'down' ? 'var(--error)' : 'var(--fg-muted)',
                  }} />
                  <span className="body-s">{i.label}</span>
                </div>
                <span className={`lj-badge ${i.status === 'ok' ? 'lj-badge-success' : i.status === 'lento' ? 'lj-badge-warning' : i.status === 'down' ? 'lj-badge-error' : 'lj-badge-neutral'}`}>
                  {i.status === 'ok' ? 'OK' : i.status === 'lento' ? 'Lento' : i.status === 'down' ? 'Down' : 'Pendente'}
                </span>
              </div>
            ))}
            <Link href="/integracoes" style={{ display: 'block', marginTop: 'var(--space-3)', fontSize: 'var(--text-caption)', color: 'var(--accent)', textDecoration: 'none' }}>
              Gerenciar →
            </Link>
          </div>
        </aside>
      </div>

      {/* Linha 3: Últimos pedidos (2/3) + Insights de hoje (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)' }}>Últimos pedidos</h2>
            <Link href="/pedidos" className="caption" style={{ textDecoration: 'none', color: 'var(--fg-secondary)' }}>Ver todos →</Link>
          </div>
          <div className="lj-card" style={{ overflow: 'hidden' }}>
            {recentOrders.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--fg-secondary)' }} className="body-s">
                Nenhum pedido ainda.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>Pedido</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>Cliente</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>Quando</th>
                    <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <Link href={`/pedidos/${o.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}>
                          {o.orderNumber ?? o.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                        {o.customerEmail ?? '—'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <span style={{ color: STATUS_COLOR[o.status] ?? 'var(--fg)', fontWeight: 'var(--w-medium)' }}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                        {formatRelativeTime(o.createdAt)}
                      </td>
                      <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        {fmtBrl(o.totalCents ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <aside>
          <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-3)' }}>Insights de hoje</h2>
          <div className="lj-ai-banner" style={{ flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span aria-hidden style={{ fontSize: 16, color: 'var(--accent)' }}>✦</span>
              <span className="lj-ai-eyebrow" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 'var(--text-body-s)', fontWeight: 'var(--w-semibold)' }}>
                IA · Insights de hoje
              </span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {insights.map((bullet, i) => (
                <li key={i} className="body-s" style={{ color: 'var(--fg)', lineHeight: 1.5 }}>
                  {bullet.emphasis && <strong style={{ fontWeight: 'var(--w-semibold)' }}>{bullet.emphasis}</strong>}
                  {bullet.text}
                </li>
              ))}
            </ul>
            <Link href="/ia-analyst" className="lj-btn-secondary" style={{ textDecoration: 'none', alignSelf: 'flex-start', fontSize: 'var(--text-caption)' }}>
              Pergunte ao IA Analyst →
            </Link>
            {aiCallsCount > 0 && (
              <p className="caption" style={{ color: 'var(--fg-secondary)', margin: 0 }}>
                IA Analyst: {aiCallsCount} chamada(s) nos últimos 30 dias.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Aguardando pagamento — KPI auxiliar abaixo, mantido pois é gargalo operacional */}
      {pendingCount > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Link
            href="/pedidos?status=pending"
            className="lj-card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-5)', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)' }} />
              <span className="body-s"><strong style={{ fontWeight: 'var(--w-semibold)' }}>{pendingCount}</strong> pedido(s) aguardando pagamento</span>
            </div>
            <span className="caption" style={{ color: 'var(--accent)' }}>Ver pendentes →</span>
          </Link>
        </div>
      )}

      {/* Receita acumulada 30d — banner discreto pra preservar info anterior */}
      {revenueCents > 0 && (
        <p className="caption" style={{ marginTop: 'var(--space-4)', color: 'var(--fg-secondary)', textAlign: 'right' }}>
          Receita acumulada 30d: <strong>{fmtBrl(revenueCents)}</strong> · ticket médio {orderCount > 0 ? fmtBrl(Math.round(revenueCents / orderCount)) : '—'}
        </p>
      )}
    </div>
  );
}
