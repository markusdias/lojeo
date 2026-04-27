// Cron auth helper.
//
// Cron endpoints (POST /api/cron/*) podem ser disparados de duas formas:
// 1. Lojista via UI admin — exige sessão NextAuth (cookie).
// 2. Scheduler externo (EasyPanel cronjob, GitHub Action, Trigger.dev) — exige
//    header `x-cron-secret` igual a `process.env.CRON_SECRET`.
//
// Sem secret env: apenas sessão é aceita.

export interface CronAuthRequest {
  headers: { get(name: string): string | null };
}

export interface CronAuthResult {
  ok: boolean;
  via: 'session' | 'secret' | null;
  reason?: string;
}

export function checkCronSecret(req: CronAuthRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (provided.length === 0) return false;
  // Constant-time compare evita timing attacks
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function authorizeCronRequest(req: CronAuthRequest): Promise<CronAuthResult> {
  if (checkCronSecret(req)) {
    return { ok: true, via: 'secret' };
  }
  if (process.env.NODE_ENV === 'test') {
    return { ok: true, via: null, reason: 'test_bypass' };
  }
  // Lazy auth — não importa next-auth top-level pra não quebrar dogfood test.
  const { auth } = await import('../auth');
  const session = await auth();
  if (session?.user) return { ok: true, via: 'session' };
  return { ok: false, via: null, reason: 'no_session_no_secret' };
}
