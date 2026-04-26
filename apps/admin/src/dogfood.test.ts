import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { db, tenants, products, behaviorEvents, sessionsBehavior } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { POST as createProduct, GET as listProducts } from './app/api/products/route';
import { POST as track } from './app/api/track/route';
import { GET as health } from './app/api/health/route';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const RUN_ID = `dogfood-${Date.now()}`;
const PRODUCT_NAME = `Anel Solitário Ouro 18k ${RUN_ID}`;
const PRODUCT_SLUG = `anel-solitario-ouro-18k-${RUN_ID.toLowerCase()}`;
const ANON_ID = `anon-${RUN_ID}`;

beforeAll(async () => {
  await db
    .insert(tenants)
    .values({
      id: TENANT_ID,
      slug: 'joias-lab',
      name: 'Joias Lab',
      templateId: 'jewelry-v1',
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(behaviorEvents).where(eq(behaviorEvents.anonymousId, ANON_ID));
  await db.delete(sessionsBehavior).where(eq(sessionsBehavior.anonymousId, ANON_ID));
  await db
    .delete(products)
    .where(and(eq(products.tenantId, TENANT_ID), eq(products.slug, PRODUCT_SLUG)));
});

function jsonReq(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': TENANT_ID,
      'user-agent': 'vitest-dogfood',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('dogfood — caso de uso completo', () => {
  it('healthcheck OK', async () => {
    const res = await health();
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('cria produto via API', async () => {
    const res = await createProduct(
      jsonReq('http://test/api/products', 'POST', {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        priceCents: 299000,
        comparePriceCents: 359000,
        sku: `ANEL-${RUN_ID}`,
        status: 'active',
        customFields: { material: 'Ouro 18k', pedra: 'Brilhante', quilate: 0.25, aro: '16' },
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.product.slug).toBe(PRODUCT_SLUG);
    expect(json.product.tenantId).toBe(TENANT_ID);
  });

  it('rejeita produto inválido', async () => {
    const res = await createProduct(
      jsonReq('http://test/api/products', 'POST', { name: 'x', priceCents: -1 }),
    );
    expect(res.status).toBe(400);
  });

  it('lista produtos do tenant', async () => {
    const res = await listProducts(jsonReq('http://test/api/products', 'GET'));
    const json = await res.json();
    expect(Array.isArray(json.products)).toBe(true);
    expect(json.products.length).toBeGreaterThanOrEqual(1);
    expect(json.products.every((p: { tenantId: string }) => p.tenantId === TENANT_ID)).toBe(true);
  });

  it('tracking ingest grava evento', async () => {
    const list = await db.select().from(products).where(eq(products.slug, PRODUCT_SLUG));
    const productId = list[0]!.id;

    const res = await track(
      jsonReq('http://test/api/track', 'POST', {
        tenantId: TENANT_ID,
        anonymousId: ANON_ID,
        consent: { essential: true, analytics: true, marketing: false },
        events: [
          {
            type: 'product_view',
            entityType: 'product',
            entityId: productId,
            metadata: { source: 'dogfood' },
            ts: Date.now(),
          },
        ],
      }),
    );
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.accepted).toBe(1);

    const events = await db
      .select()
      .from(behaviorEvents)
      .where(eq(behaviorEvents.anonymousId, ANON_ID));
    expect(events.length).toBe(1);
    expect(events[0]!.eventType).toBe('product_view');
  });
});
