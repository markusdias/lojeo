import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { db, products, productVariants, inventoryStock } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StatusItem {
  productId: string;
  priceCents: number;
  comparePriceCents: number | null;
  status: 'active' | 'archived' | 'draft';
  inStock: boolean;
  totalQty: number;
}

/**
 * GET /api/wishlist/status?productIds=uuid1,uuid2,uuid3
 *
 * Retorna estado atual dos produtos da wishlist:
 * - priceCents atual (cliente compara com snapshot localStorage pra detectar baixa)
 * - comparePriceCents (preço cheio quando há promoção pública)
 * - status (archived → "esgotado permanente")
 * - inStock + totalQty (soma estoque variantes ativas)
 *
 * Permite renderizar badges:
 * - "Voltou ao estoque" — inStock + item antigo wishlist (cliente decide via addedAt)
 * - "Em promoção" — priceCents atual < snapshot ou comparePriceCents > priceCents
 * - "Esgotado" — !inStock ou status archived
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get('productIds') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const productIds = raw.filter(id => UUID_RE.test(id)).slice(0, 50);

  if (productIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    // Produtos
    const productRows = await db
      .select({
        id: products.id,
        priceCents: products.priceCents,
        comparePriceCents: products.comparePriceCents,
        status: products.status,
      })
      .from(products)
      .where(and(eq(products.tenantId, TENANT_ID), inArray(products.id, productIds)));

    // Soma estoque por produto via JOIN variants → inventory_stock
    const stockRows = await db
      .select({
        productId: productVariants.productId,
        totalQty: sql<number>`COALESCE(SUM(${inventoryStock.qty}), 0)::int`,
      })
      .from(productVariants)
      .leftJoin(inventoryStock, eq(productVariants.id, inventoryStock.variantId))
      .where(inArray(productVariants.productId, productIds))
      .groupBy(productVariants.productId);

    const stockMap = new Map(stockRows.map(s => [s.productId, Number(s.totalQty ?? 0)]));

    const items: StatusItem[] = productRows.map(p => {
      const totalQty = stockMap.get(p.id) ?? 0;
      return {
        productId: p.id,
        priceCents: p.priceCents,
        comparePriceCents: p.comparePriceCents ?? null,
        status: (p.status as 'active' | 'archived' | 'draft') ?? 'active',
        inStock: totalQty > 0 && p.status === 'active',
        totalQty,
      };
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
