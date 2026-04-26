import Link from 'next/link';
import { db, products, tenants, orders } from '@lojeo/db';
import { eq, and, gte, sql } from 'drizzle-orm';
import { auth } from '../../auth';

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

  try {
    const [tr] = await db.select({ name: tenants.name, templateId: tenants.templateId })
      .from(tenants).where(eq(tenants.id, tid)).limit(1);
    if (tr) { tenantName = tr.name; templateId = tr.templateId; }
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
      } else {
        prevOrderCount++;
        prevRevenueCents += r.totalCents ?? 0;
      }
    }
  } catch { /* DB indisponível */ }

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

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Produtos</p>
          <p className="numeric" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>{productCount}</p>
        </div>

        <Link href="/pedidos" className="lj-card" style={{ padding: 'var(--space-5)', display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Pedidos · 30d</p>
            <DeltaChip delta={orderDelta} />
          </div>
          <p className="numeric" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>{orderCount}</p>
        </Link>

        <Link href="/pedidos?status=pending" className="lj-card" style={{ padding: 'var(--space-5)', display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-2)', color: 'var(--warning)' }}>Aguardando pagamento</p>
          <p className="numeric" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', color: 'var(--warning)' }}>{pendingCount}</p>
        </Link>

        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Receita · 30d</p>
            <DeltaChip delta={revenueDelta} />
          </div>
          <p className="numeric" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>
            {fmtBrl(revenueCents)}
          </p>
        </div>
      </section>

      <div className="lj-ai-banner">
        <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
        <div>
          <p className="lj-ai-eyebrow">IA · INSIGHTS DE HOJE</p>
          <p className="body-s" style={{ color: 'var(--fg)', marginTop: 4 }}>
            {orderCount === 0
              ? 'Nenhum pedido nos últimos 30 dias. Configure pixels Meta+TikTok e inicie campanha pra trazer tráfego qualificado.'
              : `Você fechou ${orderCount} pedido(s) nos últimos 30 dias com receita de ${fmtBrl(revenueCents)}. ${revenueDelta.up === false ? 'Receita caiu vs 30d anteriores — abra IA Analyst pra investigar.' : 'Tendência saudável — considere ampliar mídia paga.'}`}
          </p>
        </div>
      </div>
    </div>
  );
}

function DeltaChip({ delta }: { delta: { text: string; up: boolean | null } }) {
  if (delta.up === null) return null;
  const color = delta.up ? 'var(--success)' : 'var(--error)';
  const arrow = delta.up ? '▲' : '▼';
  return (
    <span className="numeric" style={{ fontSize: 'var(--text-caption)', color, fontWeight: 'var(--w-medium)' }}>
      {arrow} {delta.text}
    </span>
  );
}
