import { NextResponse } from 'next/server';
import { db, products } from '@lojeo/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ServiceCheck {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  message?: string;
  responseTimeMs?: number;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T | null; ms: number; error?: string }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { value, ms: Date.now() - start };
  } catch (err) {
    return { value: null, ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const checks: ServiceCheck[] = [];

  // 1. Database
  const dbCheck = await timed(async () => {
    const r = await db.execute(sql`SELECT 1 as ok`);
    return r;
  });
  checks.push({
    name: 'Banco de dados',
    status: dbCheck.error ? 'down' : (dbCheck.ms > 1000 ? 'degraded' : 'operational'),
    message: dbCheck.error,
    responseTimeMs: dbCheck.ms,
  });

  // 2. Storefront read (catalog)
  const productsCheck = await timed(async () => {
    return db.select({ count: sql<number>`COUNT(*)` }).from(products).limit(1);
  });
  checks.push({
    name: 'Catálogo',
    status: productsCheck.error ? 'down' : 'operational',
    message: productsCheck.error,
    responseTimeMs: productsCheck.ms,
  });

  // 3. Anthropic API (degraded mode detection)
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  checks.push({
    name: 'IA (Claude)',
    status: hasAnthropicKey ? 'operational' : 'degraded',
    message: hasAnthropicKey ? undefined : 'Chave Anthropic não configurada — modo degradado (FAQ estática)',
  });

  // 4. Storage
  const storageDriver = process.env.STORAGE_DRIVER ?? 'local';
  const storageOk = storageDriver === 'local' || (storageDriver === 'r2' && Boolean(process.env.R2_ACCOUNT_ID));
  checks.push({
    name: 'Storage de imagens',
    status: storageOk ? 'operational' : 'degraded',
    message: storageOk ? `Driver: ${storageDriver}` : 'R2 não configurado — fallback local',
  });

  // 5. Email (Resend)
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  checks.push({
    name: 'Email transacional',
    status: hasResend ? 'operational' : 'degraded',
    message: hasResend ? undefined : 'Resend não configurado — emails desativados',
  });

  // 6. Pagamentos (MP)
  const hasMp = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
  checks.push({
    name: 'Pagamentos (Mercado Pago)',
    status: hasMp ? 'operational' : 'degraded',
    message: hasMp ? undefined : 'MP não conectado — checkout em modo simulado',
  });

  // Overall status
  const hasDown = checks.some(c => c.status === 'down');
  const hasDegraded = checks.some(c => c.status === 'degraded');
  const overall: ServiceCheck['status'] = hasDown ? 'down' : hasDegraded ? 'degraded' : 'operational';

  // Maintenance flag — consulta endpoint interno (cache 60s)
  let maintenance = false;
  let maintenanceMessage: string | undefined;
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret) {
    try {
      const r = await fetch(`${process.env.STOREFRONT_URL ?? 'http://localhost:3001'}/api/internal/maintenance`, {
        headers: { 'x-internal-token': internalSecret },
        cache: 'no-store',
      });
      if (r.ok) {
        const data = (await r.json()) as { enabled?: boolean; message?: string };
        maintenance = Boolean(data.enabled);
        if (data.enabled) maintenanceMessage = data.message;
      }
    } catch {
      // fail open
    }
  }

  return NextResponse.json({
    overall,
    maintenance,
    maintenanceMessage,
    checkedAt: new Date().toISOString(),
    services: checks,
  });
}
