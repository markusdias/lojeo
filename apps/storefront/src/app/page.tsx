import { getActiveTemplate } from '../template';
import { db, products } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const tpl = await getActiveTemplate();
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const list = await db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.status, 'active')))
    .limit(8);

  return (
    <main className="min-h-screen">
      <section className="border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center space-y-4">
          <p className="uppercase tracking-[0.2em] text-xs text-[var(--color-fg-muted)]">
            {tpl.name}
          </p>
          <h1 className="text-5xl md:text-6xl font-normal">
            Em breve, peças que duram para sempre.
          </h1>
          <p className="max-w-2xl mx-auto text-[var(--color-fg-muted)]">
            Joias artesanais em ouro 18k e prata 925, com garantia, frete grátis acima de R$ 500 e
            5% de desconto no Pix.
          </p>
        </div>
      </section>

      {list.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl mb-8">Destaques</h2>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {list.map((p) => (
              <li key={p.id} className="space-y-2">
                <div className="aspect-square bg-[var(--color-bg-elevated)] border border-[var(--color-border)]" />
                <p className="text-sm">{p.name}</p>
                <p className="text-sm font-mono">
                  {(p.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: tpl.currency })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-[var(--color-border)] py-8">
        <p className="max-w-5xl mx-auto px-6 text-xs text-[var(--color-fg-muted)]">
          © {new Date().getFullYear()} {tpl.name} · template <code>{tpl.id}</code> · tipografia{' '}
          <code>{tpl.typography.default}</code>
        </p>
      </footer>
    </main>
  );
}
