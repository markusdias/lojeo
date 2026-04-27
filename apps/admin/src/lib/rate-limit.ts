/**
 * Rate limit em memória — simples, por chave (userId, IP, sessionId).
 *
 * Limitações:
 * - Em multi-instance (horizontal scale) cada instância tem seu próprio map →
 *   limites são per-instance, não globais. Para v2 trocar por Redis.
 * - Sem persistência → reinicia ao restart do processo.
 *
 * Adequado para Fase 1 (single-instance EasyPanel).
 *
 * Cópia local pra admin (storefront tem versão idêntica) — Sprint 8 v2 IA Analyst
 * rate limit configurável.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

if (typeof setInterval !== 'undefined') {
  // Limpeza periódica de buckets vencidos (uma vez por hora)
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }, 60 * 60 * 1000);
}

export interface RateLimitOptions {
  /** Identificador único do bucket (e.g. userId, IP, sessionId) */
  key: string;
  /** Número máximo de operações permitidas dentro da janela */
  max: number;
  /** Janela de tempo em ms (e.g. 1 min = 60_000) */
  windowMs: number;
}

export interface RateLimitResult {
  /** Se a operação está dentro do limite */
  ok: boolean;
  /** Quantas operações ainda restam na janela atual */
  remaining: number;
  /** Quando a janela atual reseta (timestamp ms) */
  resetAt: number;
  /** Em segundos pra próxima janela (útil em header Retry-After) */
  retryAfterSec: number;
}

export function checkRateLimit({ key, max, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt, retryAfterSec: 0 };
  }

  if (entry.count >= max) {
    return {
      ok: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return {
    ok: true,
    remaining: max - entry.count,
    resetAt: entry.resetAt,
    retryAfterSec: 0,
  };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
