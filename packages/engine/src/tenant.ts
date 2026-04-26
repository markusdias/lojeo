import { eq } from 'drizzle-orm';
import { db, tenants, type Tenant } from '@lojeo/db';

const cache = new Map<string, Tenant>();

export async function getTenantById(id: string): Promise<Tenant | null> {
  if (cache.has(id)) return cache.get(id)!;
  const t = await db.query.tenants.findFirst({ where: eq(tenants.id, id) });
  if (t) cache.set(id, t);
  return t ?? null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const t = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
  return t ?? null;
}

export function clearTenantCache(): void {
  cache.clear();
}
