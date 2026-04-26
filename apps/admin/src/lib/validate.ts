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
