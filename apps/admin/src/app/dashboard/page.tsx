import { auth, signOut } from '../../auth';
import { db, products, tenants } from '@lojeo/db';
import { eq } from 'drizzle-orm';

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  const productCount = (await db.select().from(products).where(eq(products.tenantId, tenantId))).length;

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

      <section className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Produtos</p>
          <p className="text-3xl font-semibold mt-2">{productCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Pedidos</p>
          <p className="text-3xl font-semibold mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Receita (BRL)</p>
          <p className="text-3xl font-semibold mt-2">R$ 0,00</p>
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
