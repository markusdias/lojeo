import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Schemas Zod compartilhados — uso em mutations admin para garantir
 * validação consistente. Cada schema retorna mensagem de erro PT-BR.
 */

// ── Primitives ───────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid('UUID inválido');
export const emailSchema = z.string().email('Email inválido').max(300, 'Email muito longo');
export const slugSchema = z
  .string()
  .min(1, 'Slug obrigatório')
  .max(100, 'Slug muito longo')
  .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens');

// Money em cents (R$1,00 = 100). Não-negativo, máx R$1.000.000,00 = 100M cents
export const moneyCentsSchema = z
  .number()
  .int('Valor deve ser inteiro em centavos')
  .nonnegative('Valor não pode ser negativo')
  .max(100_000_000, 'Valor excede limite');

export const positiveIntSchema = z.number().int().positive();

// ── Enums comuns ─────────────────────────────────────────────────────────────

export const orderStatusSchema = z.enum([
  'pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled',
]);

export const ticketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const ugcStatusSchema = z.enum(['pending', 'moderating', 'approved', 'rejected']);

export const userRoleSchema = z.enum([
  'owner', 'admin', 'operador', 'editor', 'atendimento', 'financeiro',
]);

export const experimentStatusSchema = z.enum(['draft', 'active', 'paused', 'completed']);

// ── Domain shapes ────────────────────────────────────────────────────────────

export const productTagSchema = z.object({
  productId: uuidSchema,
  x: z.number().min(0).max(1, 'x deve estar entre 0 e 1'),
  y: z.number().min(0).max(1, 'y deve estar entre 0 e 1'),
  label: z.string().max(80).optional(),
});

export const ugcPatchSchema = z.object({
  status: ugcStatusSchema.optional(),
  rejectionReason: z.string().max(500).optional(),
  productsTagged: z.array(productTagSchema).optional(),
});

export const ticketPatchSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assignedToUserId: uuidSchema.nullable().optional(),
});

export const userInviteSchema = z.object({
  email: emailSchema,
  role: userRoleSchema,
});

// ── Coupons ──────────────────────────────────────────────────────────────────

export const couponTypeSchema = z.enum(['percent', 'fixed', 'free_shipping']);

const couponCodeSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9_-]{2,60}$/, 'code: A-Z, 0-9, _-, 2..60 chars'));

const couponDateSchema = z
  .string()
  .datetime({ offset: true, message: 'data inválida (use ISO 8601)' })
  .nullable()
  .optional();

const couponValueRefinement = (data: { type: string; value?: number | undefined }, ctx: z.RefinementCtx) => {
  if (data.value === undefined) return;
  const v = data.value;
  if (data.type === 'percent' && (v < 1 || v > 100)) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'percent: value deve estar entre 1 e 100' });
  }
  if (data.type === 'fixed' && v < 1) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'fixed: value (cents) deve ser >= 1' });
  }
  if (data.type === 'free_shipping' && v !== 0) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'free_shipping: value deve ser 0' });
  }
};

export const couponCreateSchema = z
  .object({
    code: couponCodeSchema,
    name: z.string().trim().min(1, 'name obrigatório').max(200, 'name muito longo'),
    type: couponTypeSchema,
    value: z.number().int('value deve ser inteiro').default(0),
    minOrderCents: z.number().int().nonnegative('minOrderCents inválido').default(0),
    maxUses: z.number().int().min(1, 'maxUses deve ser >= 1').nullable().optional(),
    startsAt: couponDateSchema,
    endsAt: couponDateSchema,
  })
  .superRefine((data, ctx) => {
    couponValueRefinement(data, ctx);
    if (data.startsAt && data.endsAt) {
      const s = new Date(data.startsAt).getTime();
      const e = new Date(data.endsAt).getTime();
      if (e <= s) {
        ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'endsAt deve ser posterior a startsAt' });
      }
    }
  });

export const couponPatchSchema = z
  .object({
    name: z.string().trim().min(1, 'name não pode ser vazio').max(200).optional(),
    type: couponTypeSchema.optional(),
    value: z.number().int('value deve ser inteiro').optional(),
    minOrderCents: z.number().int().nonnegative('minOrderCents inválido').optional(),
    maxUses: z.number().int().min(1, 'maxUses deve ser >= 1').nullable().optional(),
    startsAt: couponDateSchema,
    endsAt: couponDateSchema,
    active: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== undefined && data.value !== undefined) {
      couponValueRefinement({ type: data.type, value: data.value }, ctx);
    }
    if (data.startsAt && data.endsAt) {
      const s = new Date(data.startsAt).getTime();
      const e = new Date(data.endsAt).getTime();
      if (e <= s) {
        ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'endsAt deve ser posterior a startsAt' });
      }
    }
  });

// ── Experiments ──────────────────────────────────────────────────────────────

const experimentKeySchema = z
  .string()
  .trim()
  .min(1, 'key obrigatória')
  .regex(/^[a-z0-9-_]+$/, 'key: lowercase, números, dash ou underscore');

const experimentVariantSchema = z.object({
  key: experimentKeySchema,
  name: z.string().trim().min(1, 'name obrigatório'),
  weight: z.number().positive().max(100, 'weight inválido (0 < w <= 100)'),
  payload: z.record(z.unknown()).optional(),
});

export const experimentCreateSchema = z
  .object({
    key: experimentKeySchema,
    name: z.string().trim().min(1, 'name obrigatório').max(200),
    description: z.string().max(2000).optional(),
    targetMetric: z.string().trim().max(80).optional(),
    audience: z.record(z.unknown()).optional(),
    variants: z.array(experimentVariantSchema).min(2, 'mínimo 2 variantes'),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    let total = 0;
    for (const v of data.variants) {
      if (seen.has(v.key)) {
        ctx.addIssue({ code: 'custom', path: ['variants'], message: `key duplicada: ${v.key}` });
      }
      seen.add(v.key);
      total += v.weight;
    }
    if (Math.abs(total - 100) > 0.5) {
      ctx.addIssue({
        code: 'custom',
        path: ['variants'],
        message: `soma de weights deve ser 100 (atual: ${total})`,
      });
    }
  });

// ── Helpers ──────────────────────────────────────────────────────────────────

export type ValidationError = {
  error: 'validation_failed';
  fields: Array<{ path: string; message: string }>;
};

/**
 * Parse Zod-style result into a NextResponse 400 com lista de erros formatada.
 * Use em handlers: `const data = await parseOrError(req, schema); if (data instanceof NextResponse) return data;`
 */
export async function parseOrError<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<T | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    const payload: ValidationError = { error: 'validation_failed', fields };
    return NextResponse.json(payload, { status: 400 });
  }
  return result.data;
}

/**
 * Versão para query params (URL search params). Coerce strings → tipos esperados.
 * Schema deve usar z.coerce.number() / z.coerce.boolean() conforme necessário.
 */
export function parseQueryOrError<T>(
  url: URL,
  schema: z.ZodType<T>,
): T | NextResponse {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => { params[key] = value; });
  const result = schema.safeParse(params);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    const payload: ValidationError = { error: 'validation_failed', fields };
    return NextResponse.json(payload, { status: 400 });
  }
  return result.data;
}
