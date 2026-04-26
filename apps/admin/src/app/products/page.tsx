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
  draft: '#92400E',
  active: '#065F46',
  archived: '#6B7280',
};

export default async function ProductsPage() {
  let list: (typeof products.$inferSelect)[] = [];
  try {
    list = await db.select().from(products).where(eq(products.tenantId, tenantId())).limit(200);
  } catch { /* DB indisponível */ }

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Produtos</h1>
        <span style={{ fontSize: 13, color: '#6B7280' }}>{list.length} produto(s)</span>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#6B7280' }}>
          <p style={{ fontSize: 16 }}>Nenhum produto cadastrado.</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>Crie produtos via API ou importe via CSV.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Nome</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>SKU</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Preço</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Criado em</th>
                <th style={{ padding: '8px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const statusLabel = STATUS_LABEL[p.status] ?? p.status;
                const statusColor = STATUS_COLOR[p.status] ?? '#6B7280';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '10px 12px', color: '#6B7280' }}>{p.sku ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{fmt(p.priceCents)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                        background: `${statusColor}18`, color: statusColor,
                      }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6B7280' }}>
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Link href={`/products/${p.id}`} style={{ color: '#2563EB', textDecoration: 'none', fontSize: 13 }}>
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
