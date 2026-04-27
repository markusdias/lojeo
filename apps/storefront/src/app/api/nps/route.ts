import { NextResponse } from 'next/server';
import { db, npsResponses } from '@lojeo/db';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const npsSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(2000).optional().nullable(),
  customerEmail: z.string().email().optional().nullable(),
  surveyTrigger: z.enum(['delivery_d7', 'ticket_close', 'manual', 'web_widget']).default('manual'),
  relatedOrderId: z.string().uuid().optional().nullable(),
  relatedTicketId: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  // Rate limit anti-spam: 5 NPS responses por IP em 1 hora.
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `nps:${ip}`, max: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limit', retryAfter: rl.retryAfterSec },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = npsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const inserted = await db
      .insert(npsResponses)
      .values({
        tenantId: TENANT_ID,
        userId: null,
        customerEmail: parsed.data.customerEmail ?? null,
        score: parsed.data.score,
        comment: parsed.data.comment ?? null,
        surveyTrigger: parsed.data.surveyTrigger,
        relatedOrderId: parsed.data.relatedOrderId ?? null,
        relatedTicketId: parsed.data.relatedTicketId ?? null,
      })
      .returning({ id: npsResponses.id });

    return NextResponse.json({ ok: true, id: inserted[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/nps]', err);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
