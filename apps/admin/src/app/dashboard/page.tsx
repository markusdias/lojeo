import Link from 'next/link';
import { auth, signOut } from '../../auth';
import { db, products, tenants, orders } from '@lojeo/db';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let session = null;
  try { session = await auth(); } catch { /* auth falha sem cookie */ }
  const user = session?.user;
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [tenant, productCount, orderSummary] = await Promise.all([
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
    db.select({ c: sql<number>`COUNT(*)` }).from(products).where(eq(products.tenantId, tenantId)).then(r => Number(r[0]?.c ?? 0)),
    db.select({
      count: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(${orders.totalCents}), 0)`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'pending')`,
    }).from(orders).where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, since30d))).then(r => r[0]),
  ]);

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
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
        >
          <button className="text-sm text-neutral-600 hover:text-neutral-900">Sair</button>
        </form>
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

      <section className="bg-white rounded-lg shadow p-6">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Sessão</p>
        <pre className="mt-2 text-xs bg-neutral-50 p-4 rounded overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </section>
    </main>
  );
}
