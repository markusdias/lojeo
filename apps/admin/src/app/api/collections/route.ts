import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, collections } from '@lojeo/db';
import { slugify } from '@lojeo/engine';
import { guardPermission } from '../../../lib/permission-guard';

const CreateCollectionSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  rules: z.record(z.unknown()).optional(),
});

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export async function GET(req: Request) {
  const denied = await guardPermission('products', 'read');
  if (denied) return denied;
  const tid = tenantId(req);
  const list = await db.select().from(collections).where(eq(collections.tenantId, tid));
  return NextResponse.json({ collections: list });
}

export async function POST(req: Request) {
  const denied = await guardPermission('products', 'write');
  if (denied) return denied;
  const body = await req.json();
  const parsed = CreateCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const tid = tenantId(req);
  const inserted = await db
    .insert(collections)
    .values({
      tenantId: tid,
      slug: parsed.data.slug ?? slugify(parsed.data.name),
      name: parsed.data.name,
      description: parsed.data.description,
      rules: parsed.data.rules ?? {},
    })
    .returning();
  return NextResponse.json({ collection: inserted[0] }, { status: 201 });
}
