import { NextRequest, NextResponse } from 'next/server';
import { ai, AiBudgetExceededError } from '@lojeo/ai';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../lib/roles';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { z } from 'zod';
import { parseOrError } from '../../../../lib/validate';
import { slugifyTitle } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const schema = z.object({
  topic: z.string().trim().min(3, 'topic obrigatório').max(300),
  tone: z.enum(['editorial', 'didatico', 'inspirador']).optional(),
  audience: z.string().trim().max(200).optional(),
});

const SYSTEM = `Você é editor de conteúdo de uma joalheria contemporânea brasileira.
Escreve guias úteis para clientes que pesquisam sobre joias antes de comprar.
Tom: editorial, próximo, sem promessas exageradas. PT-BR.

Saída ESTRITAMENTE em JSON com chaves:
{
  "title": "título curto e claro, 50-90 chars",
  "excerpt": "resumo de 1-2 frases para listagem, 120-200 chars",
  "body": "markdown com 4-7 parágrafos, 1 H2 e 1 H3, 600-900 palavras"
}

Não invente fatos sobre produtos específicos. Não cite preços.
Não use emojis. Use markdown puro (## H2, ### H3, **negrito**, listas com -).`;

interface DraftJSON {
  title: string;
  excerpt: string;
  body: string;
}

function tryParse(text: string): DraftJSON | null {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    const obj = JSON.parse(cleaned);
    if (typeof obj.title !== 'string' || typeof obj.body !== 'string') return null;
    return {
      title: obj.title,
      excerpt: typeof obj.excerpt === 'string' ? obj.excerpt : '',
      body: obj.body,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const userId = session?.user?.id ?? 'anon';
  const rate = checkRateLimit({
    key: `blog-ai-draft:${userId}`,
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: rate.retryAfterSec },
      { status: 429 },
    );
  }

  const parsed = await parseOrError(req, schema);
  if (parsed instanceof NextResponse) return parsed;

  const tone = parsed.tone ?? 'editorial';
  const audience = parsed.audience ?? 'clientes interessados em joalheria contemporânea';

  const userPrompt = `Tópico: ${parsed.topic}
Público-alvo: ${audience}
Tom: ${tone}

Gere o draft completo do artigo de blog em JSON, seguindo o sistema.`;

  try {
    const result = await ai({
      feature: 'blog.draft',
      tenantId: TENANT_ID,
      tier: 'sonnet',
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2400,
      temperature: 0.7,
      cacheTtlSec: 60 * 60 * 24, // 24h — drafts pra mesmo tópico reaproveitam
    });

    const draft = tryParse(result.text);
    if (!draft) {
      // Modo degradado: devolve raw como body, lojista edita
      return NextResponse.json({
        ok: true,
        degraded: true,
        draft: {
          title: parsed.topic,
          slug: slugifyTitle(parsed.topic),
          excerpt: '',
          body: result.text,
        },
        cached: result.cached,
        model: result.model,
      });
    }

    return NextResponse.json({
      ok: true,
      degraded: false,
      draft: {
        title: draft.title,
        slug: slugifyTitle(draft.title),
        excerpt: draft.excerpt,
        body: draft.body,
      },
      cached: result.cached,
      model: result.model,
    });
  } catch (err) {
    if (err instanceof AiBudgetExceededError) {
      return NextResponse.json(
        { error: 'ai_budget_exceeded', limitUsd: err.limitUsd, mtdUsd: err.mtdUsd },
        { status: 402 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'ai_failed', detail: msg }, { status: 502 });
  }
}
