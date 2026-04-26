import Link from 'next/link';
import { db, products, tenants, orders, aiCalls } from '@lojeo/db';
import { eq, and, gte, sql, desc, count } from 'drizzle-orm';
import { auth } from '../../auth';
import { MetricCard } from '../../components/ui/metric-card';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmtBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function pctDelta(curr: number, prev: number): { text: string; up: boolean | null } {
  if (prev === 0 && curr === 0) return { text: '—', up: null };
  if (prev === 0) return { text: 'novo', up: true };
  const d = ((curr - prev) / prev) * 100;
  return { text: `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`, up: d >= 0 };
}

interface IntegrationStatus {
  label: string;
  status: 'ok' | 'pending' | 'down' | 'lento';
  detail?: string;
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
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const between60and30d = new Date(now - 60 * 24 * 60 * 60 * 1000);

  let tenantName = '';
  let templateId = '';
  let productCount = 0;
  let orderCount = 0;
  let revenueCents = 0;
  let pendingCount = 0;
  let prevOrderCount = 0;
  let prevRevenueCents = 0;
  const dailyRevenue = new Array(30).fill(0);
  const dailyOrders = new Array(30).fill(0);
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
        { label: 'Bling NF-e', status: integ.bling?.connected ? 'ok' : 'pending', detail: integ.bling?.connected ? 'Conectado' : 'Desconectado' },
        { label: 'Melhor Envio', status: integ.melhorEnvio?.connected ? 'ok' : 'pending', detail: integ.melhorEnvio?.connected ? 'Conectado' : 'Desconectado' },
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
    const rows = await db.select({ status: orders.status, totalCents: orders.totalCents, createdAt: orders.createdAt })
      .from(orders).where(and(eq(orders.tenantId, tid), gte(orders.createdAt, between60and30d)));
    for (const r of rows) {
      const ts = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt as string).getTime();
      const isCurrent = ts >= since30d.getTime();
      if (isCurrent) {
        orderCount++;
        revenueCents += r.totalCents ?? 0;
        if (r.status === 'pending') pendingCount++;
        const dayIdx = Math.floor((now - ts) / (24 * 60 * 60 * 1000));
        if (dayIdx >= 0 && dayIdx < 30) {
          dailyRevenue[29 - dayIdx] += r.totalCents ?? 0;
          dailyOrders[29 - dayIdx] += 1;
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

  const orderDelta = pctDelta(orderCount, prevOrderCount);
  const revenueDelta = pctDelta(revenueCents, prevRevenueCents);

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
        <MetricCard label="Receita · 30d" value={fmtBrl(revenueCents)} delta={revenueDelta} sparkData={dailyRevenue} accent />
        <MetricCard label="Pedidos · 30d" value={String(orderCount)} delta={orderDelta} sparkData={dailyOrders} href="/pedidos" />
        <MetricCard label="Aguardando pagamento" value={String(pendingCount)} warning sparkData={dailyOrders.map(v => Math.min(v, pendingCount + 1))} href="/pedidos?status=pending" />
        <MetricCard label="Produtos" value={String(productCount)} sparkData={new Array(30).fill(productCount)} />
      </section>

      <div className="lj-ai-banner" style={{ marginBottom: 'var(--space-8)' }}>
        <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
        <div>
          <p className="lj-ai-eyebrow">IA · INSIGHTS DE HOJE</p>
          <p className="body-s" style={{ color: 'var(--fg)', marginTop: 4 }}>
            {orderCount === 0
              ? 'Nenhum pedido nos últimos 30 dias. Configure pixels Meta+TikTok e inicie campanha pra trazer tráfego qualificado.'
              : `${orderCount} pedido(s) · receita ${fmtBrl(revenueCents)} · ticket médio ${fmtBrl(Math.round(revenueCents / orderCount))}. ${revenueDelta.up === false ? 'Receita caiu vs 30d anteriores — abra IA Analyst pra investigar.' : revenueDelta.up ? 'Tendência saudável — considere ampliar mídia paga.' : 'Performance estável.'} ${aiCallsCount > 0 ? `IA Analyst: ${aiCallsCount} chamada(s) no período.` : ''}`}
          </p>
        </div>
      </div>

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
    </div>
  );
}

