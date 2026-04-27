import Link from 'next/link';
import {
  db,
  wishlistItems,
  giftCards,
  restockNotifications,
  products,
  productVariants,
  inventoryStock,
} from '@lojeo/db';
import { eq, and, sql, desc, gte, lte, inArray } from 'drizzle-orm';
import { WishlistTabs, type Tab } from './tabs';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export const dynamic = 'force-dynamic';

interface WishlistRow {
  productId: string;
  productName: string;
  sku: string | null;
  count: number;
  stock: number;
  priceCents: number;
}

interface GiftCardRow {
  code: string;
  initialValueCents: number;
  currentBalanceCents: number;
  recipientEmail: string | null;
  status: string;
  createdAt: string;
  expiresAt: string | null;
}

interface RestockRow {
  productId: string;
  productName: string;
  sku: string | null;
  waiting: number;
  lastSignupAt: string | null;
}

interface GiftCardSummary {
  inCirculationCents: number;
  redeemedThisMonthCents: number;
  activeCount: number;
  expiringIn30dCount: number;
}

async function fetchWishlists(tenantId: string): Promise<WishlistRow[]> {
  const rows = await db
    .select({
      productId: wishlistItems.productId,
      productName: products.name,
      sku: products.sku,
      priceCents: products.priceCents,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.tenantId, tenantId))
    .groupBy(wishlistItems.productId, products.name, products.sku, products.priceCents)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  if (rows.length === 0) return [];

  const productIds = rows.map(r => r.productId);
  const stockRows = await db
    .select({
      productId: productVariants.productId,
      qty: sql<number>`cast(coalesce(sum(${inventoryStock.qty}) - sum(${inventoryStock.reserved}), 0) as int)`,
    })
    .from(productVariants)
    .leftJoin(inventoryStock, eq(inventoryStock.variantId, productVariants.id))
    .where(
      and(
        eq(productVariants.tenantId, tenantId),
        inArray(productVariants.productId, productIds),
      ),
    )
    .groupBy(productVariants.productId);

  const stockMap = new Map(stockRows.map(s => [s.productId, Number(s.qty ?? 0)]));

  return rows.map(r => ({
    productId: r.productId,
    productName: r.productName,
    sku: r.sku,
    count: Number(r.count),
    stock: stockMap.get(r.productId) ?? 0,
    priceCents: r.priceCents,
  }));
}

async function fetchGiftCards(tenantId: string): Promise<{ rows: GiftCardRow[]; summary: GiftCardSummary }> {
  const rows = await db
    .select({
      code: giftCards.code,
      initialValueCents: giftCards.initialValueCents,
      currentBalanceCents: giftCards.currentBalanceCents,
      recipientEmail: giftCards.recipientEmail,
      status: giftCards.status,
      createdAt: giftCards.createdAt,
      expiresAt: giftCards.expiresAt,
    })
    .from(giftCards)
    .where(eq(giftCards.tenantId, tenantId))
    .orderBy(desc(giftCards.createdAt))
    .limit(50);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Active = status active AND balance > 0
  const allActive = await db
    .select({
      total: sql<number>`cast(coalesce(sum(${giftCards.currentBalanceCents}), 0) as int)`,
      cnt: sql<number>`cast(count(*) as int)`,
    })
    .from(giftCards)
    .where(
      and(
        eq(giftCards.tenantId, tenantId),
        eq(giftCards.status, 'active'),
        sql`${giftCards.currentBalanceCents} > 0`,
      ),
    );

  // Redeemed this month: status used OR balance changed; aproximação: cards com balance < initial
  const redeemedThisMonth = await db
    .select({
      total: sql<number>`cast(coalesce(sum(${giftCards.initialValueCents} - ${giftCards.currentBalanceCents}), 0) as int)`,
    })
    .from(giftCards)
    .where(
      and(
        eq(giftCards.tenantId, tenantId),
        gte(giftCards.createdAt, startOfMonth),
      ),
    );

  // Expiring in 30 days
  const expiring = await db
    .select({ cnt: sql<number>`cast(count(*) as int)` })
    .from(giftCards)
    .where(
      and(
        eq(giftCards.tenantId, tenantId),
        eq(giftCards.status, 'active'),
        sql`${giftCards.currentBalanceCents} > 0`,
        gte(giftCards.expiresAt, now),
        lte(giftCards.expiresAt, in30d),
      ),
    );

  return {
    rows: rows.map(r => ({
      ...r,
      createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string)).toISOString(),
      expiresAt: r.expiresAt
        ? (r.expiresAt instanceof Date ? r.expiresAt : new Date(r.expiresAt as string)).toISOString()
        : null,
    })),
    summary: {
      inCirculationCents: Number(allActive[0]?.total ?? 0),
      redeemedThisMonthCents: Number(redeemedThisMonth[0]?.total ?? 0),
      activeCount: Number(allActive[0]?.cnt ?? 0),
      expiringIn30dCount: Number(expiring[0]?.cnt ?? 0),
    },
  };
}

async function fetchRestock(tenantId: string): Promise<RestockRow[]> {
  const rows = await db
    .select({
      productId: restockNotifications.productId,
      productName: products.name,
      sku: products.sku,
      waiting: sql<number>`cast(count(*) as int)`,
      lastSignupAt: sql<string>`max(${restockNotifications.createdAt})`,
    })
    .from(restockNotifications)
    .innerJoin(products, eq(restockNotifications.productId, products.id))
    .where(
      and(
        eq(restockNotifications.tenantId, tenantId),
        sql`${restockNotifications.notifiedAt} IS NULL`,
      ),
    )
    .groupBy(restockNotifications.productId, products.name, products.sku)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  return rows.map(r => ({
    productId: r.productId,
    productName: r.productName,
    sku: r.sku,
    waiting: Number(r.waiting),
    lastSignupAt: r.lastSignupAt,
  }));
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function WishlistAdminPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const initialTab: Tab = (sp.tab === 'gift-cards' || sp.tab === 'back-in-stock') ? sp.tab : 'wishlists';

  const [wishlists, giftcardsData, restock] = await Promise.all([
    fetchWishlists(TENANT_ID),
    fetchGiftCards(TENANT_ID),
    fetchRestock(TENANT_ID),
  ]);

  const totals = {
    wishlists: wishlists.reduce((sum, r) => sum + r.count, 0),
    giftcards: giftcardsData.summary.activeCount,
    backstock: restock.reduce((sum, r) => sum + r.waiting, 0),
  };

  // Top wishlist for AI insight
  const topWishlist = wishlists[0];

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Loja</Link>
        <span style={{ margin: '0 6px', color: 'var(--fg-muted)' }}>/</span>
        <span style={{ color: 'var(--fg-secondary)' }}>Demanda</span>
      </p>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-1)' }}>
          Wishlist e gift cards
        </h1>
        <p className="body-s">
          Sinais de demanda que sua loja não está vendo no relatório de vendas.
        </p>
      </div>

      {/* AI Insight (pra topo wishlist com estoque baixo) */}
      {topWishlist && topWishlist.stock <= topWishlist.count / 8 && (
        <div className="lj-card" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="lj-badge lj-badge-accent" style={{ flexShrink: 0 }}>✨ IA</span>
          <p className="body-s" style={{ flex: 1, lineHeight: 1.55 }}>
            <strong>{topWishlist.productName}</strong> tem {topWishlist.count} pessoas esperando
            {topWishlist.stock === 0 ? ' — está zerado.' : ` — ${topWishlist.stock} unidades em estoque.`}
            {' '}Repor pode gerar até R$ {(topWishlist.priceCents * topWishlist.count / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} de receita potencial.
          </p>
          <Link href="/ia-analyst" className="lj-btn-primary" style={{ fontSize: 'var(--text-caption)', whiteSpace: 'nowrap', textDecoration: 'none' }}>
            Pergunte ao IA →
          </Link>
        </div>
      )}

      <WishlistTabs
        initialTab={initialTab}
        totals={totals}
        wishlists={wishlists}
        giftcards={giftcardsData.rows}
        giftcardsSummary={giftcardsData.summary}
        restock={restock}
      />
    </div>
  );
}
