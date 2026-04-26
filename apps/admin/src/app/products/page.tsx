import { db, products } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  archived: 'Arquivado',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--warning)',
  active: 'var(--success)',
  archived: 'var(--fg-muted)',
};

export default async function ProductsPage() {
  let list: (typeof products.$inferSelect)[] = [];
  try {
    list = await db.select().from(products).where(eq(products.tenantId, tenantId())).limit(200);
  } catch { /* DB indisponível */ }

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Produtos</h1>
          <p className="body-s">{list.length} produto{list.length === 1 ? '' : 's'} cadastrado{list.length === 1 ? '' : 's'}</p>
        </div>
        <Link href="/products/new" className="lj-btn-primary" style={{ textDecoration: 'none' }}>+ Novo produto</Link>
      </header>

      {list.length === 0 ? (
        <div className="lj-card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <p className="body" style={{ marginBottom: 'var(--space-2)' }}>Nenhum produto cadastrado.</p>
          <p className="body-s">Crie produtos via API ou importe via CSV.</p>
        </div>
      ) : (
        <div className="lj-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>SKU</th>
                <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Preço</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Status</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Criado em</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const statusLabel = STATUS_LABEL[p.status] ?? p.status;
                const statusColor = STATUS_COLOR[p.status] ?? 'var(--fg-muted)';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--w-medium)' }}>{p.name}</td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>{p.sku ?? '—'}</td>
                    <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{fmt(p.priceCents)}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-caption)', fontWeight: 'var(--w-medium)',
                        color: statusColor,
                        border: `1px solid ${statusColor}`,
                      }}>
                        <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                        {statusLabel}
                      </span>
                    </td>
                    <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Link href={`/products/${p.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 'var(--text-caption)', fontWeight: 'var(--w-medium)' }}>
                        Editar →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
