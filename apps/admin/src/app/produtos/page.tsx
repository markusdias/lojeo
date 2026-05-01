import {
  db,
  products,
  productVariants,
  productImages,
  inventoryStock,
  orders,
  orderItems,
} from '@lojeo/db';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import Link from 'next/link';
import { EmptyState, IconPackage } from '../../components/ui/empty-state';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type ProductRow = typeof products.$inferSelect;

interface ProductView {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  priceCents: number;
  variantCount: number;
  photoCount: number;
  stock: number;
  sales30d: number;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  archived: 'Arquivado',
};

function statusBadge(status: string, stock: number) {
  // Override: estoque zero em produto ativo aparece como "Sem estoque"
  if (status === 'active' && stock === 0) {
    return {
      label: 'Sem estoque',
      bg: 'var(--error-soft)',
      fg: 'var(--error)',
      dot: 'var(--error)',
    };
  }
  if (status === 'active') {
    return {
      label: 'Ativo',
      bg: 'var(--success-soft)',
      fg: 'var(--success)',
      dot: 'var(--success)',
    };
  }
  if (status === 'draft') {
    return {
      label: 'Rascunho',
      bg: 'var(--warning-soft)',
      fg: 'var(--warning)',
      dot: 'var(--warning)',
    };
  }
  return {
    label: STATUS_LABEL[status] ?? status,
    bg: 'var(--neutral-50)',
    fg: 'var(--neutral-500)',
    dot: 'var(--neutral-500)',
  };
}

export default async function ProductsPage() {
  const tid = tenantId();

  let baseList: ProductRow[] = [];
  try {
    baseList = await db
      .select()
      .from(products)
      .where(eq(products.tenantId, tid))
      .limit(200);
  } catch {
    /* DB indisponível */
  }

  const productIds = baseList.map((p) => p.id);

  // Stock + variant count via inventory_stock JOIN product_variants
  let stockByProduct = new Map<string, number>();
  let variantCountByProduct = new Map<string, number>();
  let photoCountByProduct = new Map<string, number>();
  let salesByProduct = new Map<string, number>();

  if (productIds.length > 0) {
    try {
      const stockRows = await db
        .select({
          productId: productVariants.productId,
          variants: sql<number>`cast(count(distinct ${productVariants.id}) as int)`,
          available: sql<number>`cast(coalesce(sum(${inventoryStock.qty} - ${inventoryStock.reserved}), 0) as int)`,
        })
        .from(productVariants)
        .leftJoin(
          inventoryStock,
          and(
            eq(inventoryStock.variantId, productVariants.id),
            eq(inventoryStock.tenantId, tid),
          ),
        )
        .where(
          and(
            eq(productVariants.tenantId, tid),
            inArray(productVariants.productId, productIds),
          ),
        )
        .groupBy(productVariants.productId);

      for (const r of stockRows) {
        stockByProduct.set(r.productId, Number(r.available ?? 0));
        variantCountByProduct.set(r.productId, Number(r.variants ?? 0));
      }
    } catch {
      /* sem dados de estoque */
    }

    try {
      const photoRows = await db
        .select({
          productId: productImages.productId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(productImages)
        .where(
          and(
            eq(productImages.tenantId, tid),
            inArray(productImages.productId, productIds),
          ),
        )
        .groupBy(productImages.productId);

      for (const r of photoRows) {
        photoCountByProduct.set(r.productId, Number(r.count ?? 0));
      }
    } catch {
      /* sem fotos */
    }

    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const salesRows = await db
        .select({
          productId: productVariants.productId,
          sales: sql<number>`cast(coalesce(sum(${orderItems.qty}), 0) as int)`,
        })
        .from(orderItems)
        .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(
          and(
            eq(orders.tenantId, tid),
            inArray(orders.status, ['paid', 'preparing', 'shipped', 'delivered']),
            gte(orders.createdAt, since),
            inArray(productVariants.productId, productIds),
          ),
        )
        .groupBy(productVariants.productId);

      for (const r of salesRows) {
        salesByProduct.set(r.productId, Number(r.sales ?? 0));
      }
    } catch {
      /* sem vendas */
    }
  }

  const list: ProductView[] = baseList.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    status: p.status,
    priceCents: p.priceCents,
    variantCount: variantCountByProduct.get(p.id) ?? 0,
    photoCount: photoCountByProduct.get(p.id) ?? 0,
    stock: stockByProduct.get(p.id) ?? 0,
    sales30d: salesByProduct.get(p.id) ?? 0,
  }));

  const totalCount = list.length;
  const activeCount = list.filter((p) => p.status === 'active').length;
  const draftCount = list.filter((p) => p.status === 'draft').length;
  const outOfStockCount = list.filter(
    (p) => p.status === 'active' && p.stock === 0,
  ).length;

  return (
    <div
      style={{
        padding: 'var(--space-8) var(--space-8) var(--space-12)',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
      }}
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <nav className="lj-breadcrumb" aria-label="Breadcrumb">
        <span>Catálogo</span>
        <span className="lj-breadcrumb-sep" aria-hidden>
          /
        </span>
        <span className="lj-breadcrumb-current">Produtos</span>
      </nav>

      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--text-h1)',
              fontWeight: 'var(--w-semibold)',
              letterSpacing: 'var(--track-tight)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Produtos
          </h1>
          <p className="body-s">
            {totalCount} produto{totalCount === 1 ? '' : 's'} ·{' '}
            {outOfStockCount} com estoque zerado
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" className="lj-btn-secondary">
            Importar CSV
          </button>
          <Link
            href="/produtos/novo"
            className="lj-btn-primary"
            style={{ textDecoration: 'none' }}
          >
            + Novo produto
          </Link>
        </div>
      </header>

      {/* Toolbar: search + chips + filtros avançados */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '1 1 280px',
            minWidth: 240,
            maxWidth: 360,
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--fg-muted)',
              display: 'inline-flex',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            className="lj-input"
            placeholder="Buscar por nome ou SKU"
            style={{ paddingLeft: 36 }}
            aria-label="Buscar por nome ou SKU"
          />
        </div>

        {/* Pill chips — pattern unificado */}
        <ChipChip label="Todos" count={totalCount} active />
        <ChipChip label="Ativos" count={activeCount} />
        <ChipChip label="Rascunhos" count={draftCount} />
        <ChipChip label="Sem estoque" count={outOfStockCount} />

        <button
          type="button"
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--accent)',
            fontSize: 'var(--text-body-s)',
            fontWeight: 'var(--w-medium)',
            cursor: 'pointer',
            padding: 'var(--space-2) var(--space-3)',
          }}
        >
          Filtros avançados
        </button>
      </div>

      {totalCount === 0 ? (
        <EmptyState
          icon={<IconPackage />}
          title="Sem produtos ainda"
          description="Comece cadastrando seu primeiro produto — leva 2 minutinhos. Ou suba uma planilha CSV se já tiver catálogo."
          action={{ label: '+ Novo produto', href: '/produtos/novo' }}
          secondaryAction={{ label: 'Importar CSV', href: '/produtos/importar' }}
        />
      ) : (
        <div className="lj-card" style={{ overflow: 'hidden' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--text-body-s)',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <th
                  style={{
                    width: 36,
                    padding: 'var(--space-3) var(--space-4)',
                    textAlign: 'left',
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: 'var(--space-3) var(--space-4)',
                    fontWeight: 'var(--w-medium)',
                    color: 'var(--fg-secondary)',
                    textTransform: 'uppercase',
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--track-wide)',
                  }}
                >
                  Produto
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: 'var(--space-3) var(--space-4)',
                    fontWeight: 'var(--w-medium)',
                    color: 'var(--fg-secondary)',
                    textTransform: 'uppercase',
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--track-wide)',
                  }}
                >
                  SKU
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: 'var(--space-3) var(--space-4)',
                    fontWeight: 'var(--w-medium)',
                    color: 'var(--fg-secondary)',
                    textTransform: 'uppercase',
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--track-wide)',
                  }}
                >
                  Estoque
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: 'var(--space-3) var(--space-4)',
                    fontWeight: 'var(--w-medium)',
                    color: 'var(--fg-secondary)',
                    textTransform: 'uppercase',
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--track-wide)',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: 'var(--space-3) var(--space-4)',
                    fontWeight: 'var(--w-medium)',
                    color: 'var(--fg-secondary)',
                    textTransform: 'uppercase',
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--track-wide)',
                  }}
                >
                  Vendas (30d)
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: 'var(--space-3) var(--space-4)',
                    fontWeight: 'var(--w-medium)',
                    color: 'var(--fg-secondary)',
                    textTransform: 'uppercase',
                    fontSize: 'var(--text-caption)',
                    letterSpacing: 'var(--track-wide)',
                  }}
                >
                  Preço
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const badge = statusBadge(p.status, p.stock);
                const stockColor =
                  p.stock === 0 ? 'var(--error)' : 'var(--fg)';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${p.name}`}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Link
                        href={`/produtos/${p.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <div
                          aria-hidden
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border)',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 'var(--w-medium)',
                              color: 'var(--fg)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontSize: 'var(--text-caption)',
                              color: 'var(--fg-secondary)',
                            }}
                          >
                            {p.variantCount} variante
                            {p.variantCount === 1 ? '' : 's'} · {p.photoCount}{' '}
                            foto{p.photoCount === 1 ? '' : 's'}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        color: 'var(--fg-secondary)',
                        fontSize: 'var(--text-caption)',
                      }}
                    >
                      {p.sku ?? '—'}
                    </td>
                    <td
                      className="numeric"
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        textAlign: 'right',
                        color: stockColor,
                        fontWeight:
                          p.stock === 0 ? 'var(--w-medium)' : 'var(--w-regular)',
                      }}
                    >
                      {p.stock}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-caption)',
                          fontWeight: 'var(--w-medium)',
                          background: badge.bg,
                          color: badge.fg,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: badge.dot,
                          }}
                        />
                        {badge.label}
                      </span>
                    </td>
                    <td
                      className="numeric"
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        textAlign: 'right',
                        color: 'var(--fg-secondary)',
                      }}
                    >
                      {p.sales30d}
                    </td>
                    <td
                      className="numeric"
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        textAlign: 'right',
                        fontWeight: 'var(--w-medium)',
                      }}
                    >
                      {fmt(p.priceCents)}
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

function ChipChip({
  label,
  count,
  active = false,
}: {
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-body-s)',
        fontWeight: 'var(--w-medium)',
        background: active ? 'var(--neutral-900)' : 'var(--bg-elevated)',
        color: active ? 'var(--surface)' : 'var(--fg)',
        border: active
          ? '1px solid var(--neutral-900)'
          : '1px solid var(--border-strong)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {label}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 'var(--w-regular)',
          opacity: active ? 0.85 : 0.65,
          color: active ? 'var(--surface)' : 'var(--fg-secondary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </span>
    </span>
  );
}
