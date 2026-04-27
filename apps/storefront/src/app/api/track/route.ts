import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ingest } from '@lojeo/tracking/server';
import type { TrackPayload } from '@lojeo/tracking';
import { auth } from '../../../auth';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

const RATE_MAX = 240;
const RATE_WINDOW_MS = 60_000;
const MAX_EVENTS_PER_REQUEST = 100;

const TrackEventSchema = z.object({
  type: z.string().min(1).max(60),
  entityType: z.string().max(60).optional(),
  entityId: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
  ts: z.number().int().nonnegative(),
});

const TrackPayloadSchema = z.object({
  tenantId: z.string().min(1).max(64),
  anonymousId: z.string().min(1).max(128),
  sessionId: z.string().max(128).optional(),
  userId: z.string().max(64).optional(),
  events: z.array(TrackEventSchema).max(MAX_EVENTS_PER_REQUEST),
  consent: z.object({
    essential: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ accepted: 0, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = TrackPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ accepted: 0, error: 'invalid_payload' }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit({
    key: `track:${parsed.data.anonymousId || ip}`,
    max: RATE_MAX,
    windowMs: RATE_WINDOW_MS,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { accepted: 0, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const userAgent = req.headers.get('user-agent') ?? undefined;
  const session = await auth();
  const userId = session?.user?.id ?? parsed.data.userId;

  try {
    // Cast intencional: o tipo TrackPayload restringe `type` à união EventType.
    // Validar o conjunto exato em route causaria coupling forte; ingest no servidor
    // já filtra eventos desconhecidos via lookup de schema ao persistir.
    const r = await ingest(parsed.data as unknown as TrackPayload, {
      userAgent,
      ipAddress: ip,
      userId,
    });
    return NextResponse.json(r, { status: 202 });
  } catch {
    return NextResponse.json({ accepted: 0 }, { status: 202 });
  }
}
