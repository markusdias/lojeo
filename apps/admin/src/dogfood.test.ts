import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import {
  db,
  tenants,
  products,
  productVariants,
  collections,
  productCollections,
  behaviorEvents,
  sessionsBehavior,
} from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { POST as createProduct, GET as listProducts } from './app/api/products/route';
import {
  GET as getProduct,
  PUT as updateProduct,
  DELETE as deleteProduct,
} from './app/api/products/[id]/route';
import { POST as createVariant, GET as listVariants } from './app/api/products/[id]/variants/route';
import {
  PUT as updateVariant,
  DELETE as deleteVariant,
} from './app/api/products/[id]/variants/[variantId]/route';
import {
  POST as createCollection,
  GET as listCollections,
} from './app/api/collections/route';
import {
  GET as getCollection,
  PUT as updateCollection,
  DELETE as deleteCollection,
  POST as assignToCollection,
} from './app/api/collections/[id]/route';
import { POST as track } from './app/api/track/route';
import { GET as health } from './app/api/health/route';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const RUN_ID = `dogfood-${Date.now()}`;
const PRODUCT_NAME = `Anel Solitário Ouro 18k ${RUN_ID}`;
const PRODUCT_SLUG = `anel-solitario-ouro-18k-${RUN_ID.toLowerCase()}`;
const COLL_NAME = `Coleção Verão ${RUN_ID}`;
const COLL_SLUG = `colecao-verao-${RUN_ID.toLowerCase()}`;
const ANON_ID = `anon-${RUN_ID}`;

let productId = '';
let variantId = '';
let collectionId = '';

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
  if (productId) {
    await db
      .delete(productCollections)
      .where(eq(productCollections.productId, productId))
      .catch(() => {});
    await db.delete(productVariants).where(eq(productVariants.productId, productId)).catch(() => {});
    await db.delete(products).where(eq(products.id, productId)).catch(() => {});
  }
  if (collectionId) {
    await db.delete(collections).where(eq(collections.id, collectionId)).catch(() => {});
  }
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

const params = <T>(p: T) => ({ params: Promise.resolve(p) });

describe('dogfood — caso de uso completo', () => {
  it('healthcheck OK', async () => {
    const res = await health();
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('cria produto', async () => {
    const res = await createProduct(
      jsonReq('http://t/api/products', 'POST', {
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
    productId = json.product.id;
    expect(productId).toBeTruthy();
  });

  it('GET produto por id', async () => {
    const res = await getProduct(jsonReq(`http://t/api/products/${productId}`, 'GET'), params({ id: productId }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.product.slug).toBe(PRODUCT_SLUG);
  });

  it('PUT atualiza produto', async () => {
    const res = await updateProduct(
      jsonReq(`http://t/api/products/${productId}`, 'PUT', {
        seoTitle: 'Anel Solitário Premium',
        warrantyMonths: 24,
      }),
      params({ id: productId }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.product.seoTitle).toBe('Anel Solitário Premium');
    expect(json.product.warrantyMonths).toBe(24);
  });

  it('cria variante', async () => {
    const res = await createVariant(
      jsonReq(`http://t/api/products/${productId}/variants`, 'POST', {
        sku: `ANEL-${RUN_ID}-16`,
        optionValues: { aro: '16' },
        priceCents: 299000,
        stockQty: 5,
      }),
      params({ id: productId }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    variantId = json.variant.id;
    expect(json.variant.stockQty).toBe(5);
  });

  it('lista variantes do produto', async () => {
    const res = await listVariants(
      jsonReq(`http://t/api/products/${productId}/variants`, 'GET'),
      params({ id: productId }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.variants.length).toBeGreaterThanOrEqual(1);
  });

  it('PUT atualiza variante (estoque)', async () => {
    const res = await updateVariant(
      jsonReq(`http://t/api/products/${productId}/variants/${variantId}`, 'PUT', { stockQty: 10 }),
      params({ id: productId, variantId }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.variant.stockQty).toBe(10);
  });

  it('cria coleção', async () => {
    const res = await createCollection(
      jsonReq('http://t/api/collections', 'POST', {
        name: COLL_NAME,
        slug: COLL_SLUG,
        description: 'Peças mais leves para o verão',
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    collectionId = json.collection.id;
  });

  it('lista coleções tenant', async () => {
    const res = await listCollections(jsonReq('http://t/api/collections', 'GET'));
    const json = await res.json();
    expect(json.collections.some((c: { id: string }) => c.id === collectionId)).toBe(true);
  });

  it('atribui produto à coleção', async () => {
    const res = await assignToCollection(
      jsonReq(`http://t/api/collections/${collectionId}`, 'POST', { productId, position: 0 }),
      params({ id: collectionId }),
    );
    expect(res.status).toBe(201);
  });

  it('GET coleção retorna produtos', async () => {
    const res = await getCollection(
      jsonReq(`http://t/api/collections/${collectionId}`, 'GET'),
      params({ id: collectionId }),
    );
    const json = await res.json();
    expect(json.products.some((p: { id: string }) => p.id === productId)).toBe(true);
  });

  it('PUT atualiza coleção', async () => {
    const res = await updateCollection(
      jsonReq(`http://t/api/collections/${collectionId}`, 'PUT', {
        description: 'Atualizada via dogfood',
      }),
      params({ id: collectionId }),
    );
    expect(res.status).toBe(200);
  });

  it('lista produtos com tenant filter', async () => {
    const res = await listProducts(jsonReq('http://t/api/products', 'GET'));
    const json = await res.json();
    expect(json.products.every((p: { tenantId: string }) => p.tenantId === TENANT_ID)).toBe(true);
  });

  it('rejeita produto inválido', async () => {
    const res = await createProduct(
      jsonReq('http://t/api/products', 'POST', { name: 'x', priceCents: -1 }),
    );
    expect(res.status).toBe(400);
  });

  it('tracking ingest grava evento', async () => {
    const res = await track(
      jsonReq('http://t/api/track', 'POST', {
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
    const events = await db
      .select()
      .from(behaviorEvents)
      .where(eq(behaviorEvents.anonymousId, ANON_ID));
    expect(events.length).toBe(1);
  });

  it('DELETE variante', async () => {
    const res = await deleteVariant(
      jsonReq(`http://t/api/products/${productId}/variants/${variantId}`, 'DELETE'),
      params({ id: productId, variantId }),
    );
    expect(res.status).toBe(200);
  });

  it('DELETE coleção', async () => {
    const res = await deleteCollection(
      jsonReq(`http://t/api/collections/${collectionId}`, 'DELETE'),
      params({ id: collectionId }),
    );
    expect(res.status).toBe(200);
    collectionId = '';
  });

  it('DELETE produto', async () => {
    const res = await deleteProduct(
      jsonReq(`http://t/api/products/${productId}`, 'DELETE'),
      params({ id: productId }),
    );
    expect(res.status).toBe(200);
    productId = '';
  });
});
