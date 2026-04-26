import { NextResponse } from 'next/server';
import { db, products, tenants } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { ai } from '@lojeo/ai';
import {
  buildProductCopySystemPrompt,
  buildProductCopyUserMessage,
  type BrandGuide,
  type ProductCopyOutput,
} from '@lojeo/ai/prompts/product-copy';

export const dynamic = 'force-dynamic';

function tenantId(req: Request): string {
  return req.headers.get('x-tenant-id') ?? process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = tenantId(req);

  const body = (await req.json().catch(() => ({}))) as { keyword?: string; tier?: 'haiku' | 'sonnet' };
  const tier = body.tier === 'haiku' ? 'haiku' : 'sonnet';

  const product = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tid)))
    .limit(1)
    .then((r) => r[0]);

  if (!product) return NextResponse.json({ error: 'produto não encontrado' }, { status: 404 });

  const tenant = await db
    .select({ config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, tid))
    .limit(1)
    .then((r) => r[0]);

  const config = (tenant?.config ?? {}) as Record<string, unknown>;
  const brandGuide = (config.brandGuide as BrandGuide | undefined) ?? undefined;

  const system = buildProductCopySystemPrompt(brandGuide);
  const userMessage = buildProductCopyUserMessage({
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    customFields: product.customFields as Record<string, unknown>,
    primaryKeyword: body.keyword,
  });

  let result: { text: string; cached: boolean; model: string; costUsdMicro: number };
  try {
    result = await ai({
      feature: 'product-copy',
      tenantId: tid,
      tier,
      system,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1024,
      cacheTtlSec: 60 * 60 * 24 * 90, // 90 days
    });
  } catch {
    return NextResponse.json({ error: 'IA indisponível — tente novamente' }, { status: 503 });
  }

  let parsed: ProductCopyOutput;
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] ?? result.text) as ProductCopyOutput;
  } catch {
    return NextResponse.json({ error: 'falha ao parsear resposta da IA', raw: result.text }, { status: 502 });
  }

  return NextResponse.json({
    copy: parsed,
    model: result.model,
    cached: result.cached,
    costUsdMicro: result.costUsdMicro,
  });
}
