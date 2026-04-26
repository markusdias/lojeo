import Link from 'next/link';
import { db, products, tenants, orders } from '@lojeo/db';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export default async function DashboardPage() {
  const tid = TENANT_ID();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let tenantName = '';
  let templateId = '';
  let productCount = 0;
  let orderCount = 0;
  let revenueCents = 0;
  let pendingCount = 0;

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
    const rows = await db.select({ status: orders.status, totalCents: orders.totalCents })
      .from(orders).where(and(eq(orders.tenantId, tid), gte(orders.createdAt, since30d)));
    orderCount = rows.length;
    revenueCents = rows.reduce((s, r) => s + (r.totalCents ?? 0), 0);
    pendingCount = rows.filter(r => r.status === 'pending').length;
  } catch { /* DB indisponível */ }

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard Lojeo</h1>
        {tenantName && (
          <p className="text-sm text-neutral-600 mt-1">
            Loja: <strong>{tenantName}</strong> · template: <code>{templateId}</code>
          </p>
        )}
      </header>

      <section className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Produtos</p>
          <p className="text-3xl font-semibold mt-2">{productCount}</p>
        </div>
        <Link href="/pedidos" className="bg-white rounded-lg shadow p-6 block hover:shadow-md transition-shadow">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Pedidos (30d)</p>
          <p className="text-3xl font-semibold mt-2">{orderCount}</p>
        </Link>
        <Link href="/pedidos?status=pending" className="bg-white rounded-lg shadow p-6 block hover:shadow-md transition-shadow">
          <p className="text-xs uppercase tracking-wide text-amber-600">Aguardando pagamento</p>
          <p className="text-3xl font-semibold mt-2 text-amber-700">{pendingCount}</p>
        </Link>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Receita (30d)</p>
          <p className="text-3xl font-semibold mt-2">
            {(revenueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </section>
    </main>
  );
}
