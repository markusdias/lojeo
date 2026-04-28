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

  // Brand guide stored in settings as flat strings — convert to prompt builder format.
  // /aparencia escreve em config.appearance.{aiTone, aiPerson, preferWords, avoidWords, slogan, tagline};
  // /settings escreve em config.brandGuide.{brandName, tonePersonality, vocabPreferred, vocabAvoid, examples}.
  // Aqui mesclamos os dois — appearance complementa, sem sobrescrever brandGuide explícito.
  interface StoredBrandGuide {
    brandName?: string;
    tonePersonality?: string;
    vocabPreferred?: string;
    vocabAvoid?: string;
    examples?: string;
  }
  interface StoredAppearance {
    aiTone?: 'formal' | 'casual-warm' | 'poetic' | 'direct';
    aiPerson?: 'voce' | 'tu' | 'voces' | 'neutro';
    preferWords?: string;
    avoidWords?: string;
    slogan?: string;
    tagline?: string;
  }
  const stored = (config.brandGuide as StoredBrandGuide | undefined);
  const appearance = (config.appearance as StoredAppearance | undefined) ?? {};
  const csv = (s?: string) => s?.split(',').map(x => x.trim()).filter(Boolean) ?? [];
  const preferred = [...csv(stored?.vocabPreferred), ...csv(appearance.preferWords)];
  const avoid = [...csv(stored?.vocabAvoid), ...csv(appearance.avoidWords)];
  const brandGuide: BrandGuide = {
    brandName: stored?.brandName?.trim() || 'Atelier',
    tonePersonality: stored?.tonePersonality,
    tone: appearance.aiTone,
    person: appearance.aiPerson,
    slogan: appearance.slogan,
    tagline: appearance.tagline,
    vocabulary: {
      preferred: preferred.length > 0 ? preferred : undefined,
      avoid: avoid.length > 0 ? avoid : undefined,
    },
    examples: stored?.examples?.split('\n').map(s => s.trim()).filter(Boolean),
  };

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
