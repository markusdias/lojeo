import { eq, and, gte, sql } from 'drizzle-orm';
import { db, aiCache, aiCalls, tenants } from '@lojeo/db';
import { logger } from '@lojeo/logger';
import { anthropicProvider } from './providers/anthropic';
import { mockProvider } from './providers/mock';
import { hashPrompt, buildCacheKey } from './cache';
import { modelFor } from './pricing';
import type { AiCallParams, AiCallResult, Provider } from './types';

export class AiBudgetExceededError extends Error {
  constructor(public readonly limitUsd: number, public readonly mtdUsd: number) {
    super(`AI monthly budget exceeded: $${mtdUsd.toFixed(2)} of $${limitUsd.toFixed(2)} limit`);
    this.name = 'AiBudgetExceededError';
  }
}

interface BudgetCacheEntry {
  expiresAt: number;
  limitUsd: number;
  mtdUsd: number;
}
const BUDGET_CACHE_TTL_MS = 60_000; // 1min cache p/ não consultar DB a cada call
const budgetCache = new Map<string, BudgetCacheEntry>();

async function checkBudget(tenantId: string): Promise<void> {
  const now = Date.now();
  const cached = budgetCache.get(tenantId);
  if (cached && cached.expiresAt > now) {
    if (cached.limitUsd > 0 && cached.mtdUsd >= cached.limitUsd) {
      throw new AiBudgetExceededError(cached.limitUsd, cached.mtdUsd);
    }
    return;
  }

  // Fetch limit from tenant config
  const [tenant] = await db.select({ config: tenants.config }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const config = (tenant?.config ?? {}) as { brandGuide?: { aiMonthlyLimitCents?: number } };
  const limitCents = Number(config.brandGuide?.aiMonthlyLimitCents ?? 0);
  const limitUsd = limitCents / 100;

  if (limitUsd <= 0) {
    budgetCache.set(tenantId, { expiresAt: now + BUDGET_CACHE_TTL_MS, limitUsd: 0, mtdUsd: 0 });
    return; // sem limite configurado
  }

  // Sum cost month-to-date
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [agg] = await db
    .select({ total: sql<number>`COALESCE(SUM(${aiCalls.costUsdMicro}), 0)::bigint` })
    .from(aiCalls)
    .where(and(eq(aiCalls.tenantId, tenantId), gte(aiCalls.createdAt, startOfMonth)));

  const mtdUsd = Number(agg?.total ?? 0) / 1_000_000;
  budgetCache.set(tenantId, { expiresAt: now + BUDGET_CACHE_TTL_MS, limitUsd, mtdUsd });

  if (mtdUsd >= limitUsd) {
    throw new AiBudgetExceededError(limitUsd, mtdUsd);
  }
}

/**
 * Invalida cache de budget para um tenant — útil quando lojista atualiza limite em /settings.
 */
export function invalidateBudgetCache(tenantId: string): void {
  budgetCache.delete(tenantId);
}

let provider: Provider | null = null;

function getProvider(): Provider {
  if (provider) return provider;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY ausente — usando mockProvider');
    provider = mockProvider;
  } else {
    provider = anthropicProvider(apiKey);
  }
  return provider;
}

export async function ai(params: AiCallParams): Promise<AiCallResult> {
  const model = modelFor(params.tier);
  const promptPayload = JSON.stringify({
    system: params.system,
    messages: params.messages,
    temperature: params.temperature,
  });
  const promptHash = hashPrompt(promptPayload);
  const cacheKey =
    params.cacheKey ?? buildCacheKey({ feature: params.feature, model, promptHash });

  const cached = await db.query.aiCache.findFirst({ where: eq(aiCache.cacheKey, cacheKey) });
  if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
    const result: AiCallResult = {
      text: (cached.response as { text: string }).text,
      cached: true,
      model: cached.model,
      inputTokens: cached.inputTokens,
      outputTokens: cached.outputTokens,
      costUsdMicro: 0,
      durationMs: 0,
    };
    await logCall(params, result, true);
    return result;
  }

  // Cache miss — verificar budget antes de chamar provider (gasta $)
  if (params.tenantId) {
    await checkBudget(params.tenantId);
  }

  let result: AiCallResult;
  try {
    result = await getProvider().call(params);
  } catch (err) {
    logger.error({ err, feature: params.feature }, 'falha provider — modo degradado');
    await logCall(params, null, false, err);
    throw err;
  }

  if ((params.cacheTtlSec ?? 0) > 0 || params.cacheTtlSec === undefined) {
    const ttl = params.cacheTtlSec ?? 60 * 60 * 24 * 30;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await db
      .insert(aiCache)
      .values({
        cacheKey,
        model: result.model,
        promptHash,
        response: { text: result.text },
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsdMicro: result.costUsdMicro,
        expiresAt,
      })
      .onConflictDoNothing();
  }

  await logCall(params, result, false);
  return result;
}

async function logCall(
  params: AiCallParams,
  result: AiCallResult | null,
  cached: boolean,
  error?: unknown,
) {
  try {
    await db.insert(aiCalls).values({
      tenantId: params.tenantId,
      feature: params.feature,
      model: result?.model ?? modelFor(params.tier),
      cached: cached ? 1 : 0,
      inputTokens: result?.inputTokens ?? 0,
      outputTokens: result?.outputTokens ?? 0,
      costUsdMicro: result?.costUsdMicro ?? 0,
      durationMs: result?.durationMs ?? 0,
      error: error ? String(error) : null,
    });
  } catch (err) {
    logger.error({ err }, 'falha ao registrar ai_call');
  }
}

export { mockProvider };
export * from './types';
export * from './pricing';
