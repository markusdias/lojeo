import Link from 'next/link';
import { db, products, tenants, orders } from '@lojeo/db';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [tenantRows, productCountRows, orderRows] = await Promise.all([
    db.select({ name: tenants.name, templateId: tenants.templateId })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(products).where(eq(products.tenantId, tenantId)),
    db.select({
      count: sql<number>`COUNT(*)::int`,
      revenue: sql<number>`COALESCE(SUM(total_cents), 0)::int`,
      pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')::int`,
    }).from(orders).where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, since30d))),
  ]);

  const tenant = tenantRows[0];
  const productCount = productCountRows[0]?.c ?? 0;
  const orderSummary = orderRows[0];

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Lojeo</h1>
          <p className="text-sm text-neutral-600">
            {tenant ? (
              <>
                Loja: <strong>{tenant.name}</strong> · template: <code>{tenant.templateId}</code>
              </>
            ) : (
              <em>Tenant não encontrado</em>
            )}
          </p>
        </div>
        <Link href="/api/auth/signout" className="text-sm text-neutral-600 hover:text-neutral-900">
          Sair
        </Link>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Produtos</p>
          <p className="text-3xl font-semibold mt-2">{productCount}</p>
        </div>
        <Link href="/pedidos" className="bg-white rounded-lg shadow p-6 block hover:shadow-md transition-shadow">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Pedidos (30d)</p>
          <p className="text-3xl font-semibold mt-2">{Number(orderSummary?.count ?? 0)}</p>
        </Link>
        <Link href="/pedidos?status=pending" className="bg-white rounded-lg shadow p-6 block hover:shadow-md transition-shadow">
          <p className="text-xs uppercase tracking-wide text-amber-600">Aguardando pagamento</p>
          <p className="text-3xl font-semibold mt-2 text-amber-700">{Number(orderSummary?.pending ?? 0)}</p>
        </Link>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Receita (30d)</p>
          <p className="text-3xl font-semibold mt-2">
            {(Number(orderSummary?.revenue ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </section>
    </main>
  );
}
