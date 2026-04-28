import { NextResponse } from 'next/server';
import { db, tenants } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import { auth } from '../../../auth';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface TenantConfig {
  contactEmail?: string;
  freeShippingThresholdCents?: number;
  pixDiscountPercent?: number;
  installmentsMax?: number;
  warrantyMonthsDefault?: number;
  robotsTxt?: string;
  aiProvider?: 'anthropic' | 'minimax';
  appearance?: {
    typo?: string;
    accent?: string;
    bgTone?: string;
    imgRadius?: string;
  };
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const tenant = await db.query.tenants?.findFirst({ where: eq(tenants.id, tenantId()) });
  if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });

  return NextResponse.json({
    name: tenant.name,
    domain: tenant.domain,
    templateId: tenant.templateId,
    config: (tenant.config ?? {}) as TenantConfig,
  });
}

// Templates registrados — SOT para validação ao trocar template ativo
const REGISTERED_TEMPLATES = new Set<string>(['jewelry-v1', 'coffee-v1']);

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json() as { name?: string; config?: TenantConfig; templateId?: string };

  const tid = tenantId();
  const tenant = await db.query.tenants?.findFirst({ where: eq(tenants.id, tid) });
  if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name?.trim()) update.name = body.name.trim().slice(0, 200);

  if (body.templateId) {
    const candidate = body.templateId.trim();
    if (!REGISTERED_TEMPLATES.has(candidate)) {
      return NextResponse.json({
        error: 'template_not_registered',
        message: `Template "${candidate}" ainda não está disponível. Templates registrados: ${[...REGISTERED_TEMPLATES].join(', ')}.`,
      }, { status: 400 });
    }
    update.templateId = candidate;
  }

  if (body.config) {
    const existing = (tenant.config ?? {}) as TenantConfig;
    update.config = { ...existing, ...body.config };
  }

  await db.update(tenants).set(update).where(eq(tenants.id, tid));
  return NextResponse.json({ ok: true });
}
