/**
 * Cache server-side para IA Analyst — Sprint 8 v2.
 *
 * Estratégia: hash determinístico (SHA-256) sobre `tenantId + ':' + queryNormalized`.
 * Lookup feito ANTES da chamada à Claude API. TTL fixo de 24h. Resposta e
 * toolCalls vêm materializados — cache HIT não custa tokens.
 *
 * Decisões:
 * - Normalização: lowercase + trim + whitespace colapsado + pontuação final
 *   removida (`?!.` no fim). Garante que "Receita 7d?" e "receita 7d" colidem.
 * - Hash inclui tenantId pra garantir isolamento mesmo que duas lojas façam a
 *   mesma pergunta.
 * - hitCount incrementado em cada HIT para o painel `/admin/ia-uso` mostrar
 *   o quanto o cache está economizando.
 * - Falhas ao gravar cache são non-fatal (logger.warn) — IA não pode quebrar
 *   por falha de cache.
 */

import { createHash } from 'node:crypto';
import { db, aiAnalystCache } from '@lojeo/db';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { logger } from '@lojeo/logger';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface CacheEntry {
  id: string;
  response: unknown;
  toolCalls: unknown;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsdMicro: number;
  hitCount: number;
  createdAt: Date;
}

/**
 * Normaliza query do usuário para hashing estável.
 * - lowercase
 * - trim
 * - colapsa whitespace interno (qualquer sequência \s+ -> 1 espaço)
 * - remove pontuação final (`?!.` no fim) repetidamente
 */
export function normalize(query: string): string {
  let n = query.toLowerCase().trim();
  n = n.replace(/\s+/g, ' ');
  // strip pontuação final (`?`, `!`, `.`) — repetidamente, ex: "vendas??!"
  n = n.replace(/[?!.]+$/u, '').trimEnd();
  return n;
}

/**
 * Hash determinístico para chave de cache. Inclui tenantId pra isolar tenants.
 */
export function hashQuery(tenantId: string, query: string): string {
  const normalized = normalize(query);
  return createHash('sha256').update(`${tenantId}:${normalized}`).digest('hex');
}

/**
 * Lookup: retorna entry se existe e foi criado dentro do TTL (24h). Se HIT,
 * incrementa hitCount em background (best-effort).
 */
export async function lookup(tenantId: string, hash: string): Promise<CacheEntry | null> {
  try {
    const since = new Date(Date.now() - CACHE_TTL_MS);
    const rows = await db
      .select({
        id: aiAnalystCache.id,
        response: aiAnalystCache.response,
        toolCalls: aiAnalystCache.toolCalls,
        model: aiAnalystCache.model,
        tokensIn: aiAnalystCache.tokensIn,
        tokensOut: aiAnalystCache.tokensOut,
        costUsdMicro: aiAnalystCache.costUsdMicro,
        hitCount: aiAnalystCache.hitCount,
        createdAt: aiAnalystCache.createdAt,
      })
      .from(aiAnalystCache)
      .where(and(
        eq(aiAnalystCache.tenantId, tenantId),
        eq(aiAnalystCache.queryHash, hash),
        gte(aiAnalystCache.createdAt, since),
      ))
      .orderBy(desc(aiAnalystCache.createdAt))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    // Increment hitCount async (não bloqueia resposta).
    void db.update(aiAnalystCache)
      .set({ hitCount: sql`${aiAnalystCache.hitCount} + 1` })
      .where(eq(aiAnalystCache.id, row.id))
      .catch((err) => logger.warn({ err }, 'ai-analyst-cache: falha ao incrementar hitCount (non-fatal)'));

    return {
      id: row.id,
      response: row.response,
      toolCalls: row.toolCalls,
      model: row.model,
      tokensIn: row.tokensIn,
      tokensOut: row.tokensOut,
      costUsdMicro: row.costUsdMicro,
      hitCount: row.hitCount,
      createdAt: row.createdAt,
    };
  } catch (err) {
    logger.warn({ err }, 'ai-analyst-cache: falha em lookup (non-fatal, segue sem cache)');
    return null;
  }
}

/**
 * Persiste resposta no cache. Falhas são logadas e ignoradas (non-fatal).
 * Em caso de conflito de chave (mesma query gravada concorrente), faz nothing.
 */
export async function store(
  tenantId: string,
  hash: string,
  query: string,
  response: unknown,
  toolCalls: unknown,
  model: string,
  tokensIn: number,
  tokensOut: number,
  costUsdMicro: number,
): Promise<void> {
  try {
    const queryNormalized = normalize(query);
    await db.insert(aiAnalystCache).values({
      tenantId,
      queryHash: hash,
      queryNormalized,
      response: response as object,
      toolCalls: (toolCalls ?? []) as object,
      model,
      tokensIn,
      tokensOut,
      costUsdMicro,
      hitCount: 0,
    }).onConflictDoNothing({
      target: [aiAnalystCache.tenantId, aiAnalystCache.queryHash],
    });
  } catch (err) {
    logger.warn({ err }, 'ai-analyst-cache: falha ao gravar cache (non-fatal)');
  }
}
