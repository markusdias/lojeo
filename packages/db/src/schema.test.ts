import { describe, expect, it } from 'vitest';
import * as schema from './schema/index';

describe('schema', () => {
  it('exporta tabelas-base com tenant_id', () => {
    expect(schema.tenants).toBeDefined();
    expect(schema.users).toBeDefined();
    expect(schema.products).toBeDefined();
    expect(schema.productVariants).toBeDefined();
    expect(schema.behaviorEvents).toBeDefined();
    expect(schema.aiCache).toBeDefined();
    expect(schema.aiCalls).toBeDefined();
  });

  it('garante coluna tenant_id em entidades multi-tenant', () => {
    const multiTenant = [
      schema.products,
      schema.productVariants,
      schema.productImages,
      schema.collections,
      schema.behaviorEvents,
      schema.sessionsBehavior,
    ];
    for (const t of multiTenant) {
      expect((t as unknown as Record<string, unknown>).tenantId, `${(t as unknown as { _: { name: string } })._?.name}`).toBeDefined();
    }
  });
});
