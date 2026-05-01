import { createHash } from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { db, behaviorEvents, sessionsBehavior } from '@lojeo/db';
import { logger } from '@lojeo/logger';
import type { TrackPayload } from './types';

const IP_SALT = process.env.TRACKING_IP_SALT ?? 'lojeo-default-salt-rotate-me';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + IP_SALT).digest('hex').slice(0, 16);
}

export async function ingest(
  payload: TrackPayload,
  opts?: { userAgent?: string; userId?: string; ipAddress?: string },
) {
  const { tenantId, anonymousId, events, consent, utm } = payload;
  if (!events?.length) return { accepted: 0 };

  let session = await db.query.sessionsBehavior.findFirst({
    where: and(eq(sessionsBehavior.tenantId, tenantId), eq(sessionsBehavior.anonymousId, anonymousId)),
  });

  if (!session) {
    const inserted = await db
      .insert(sessionsBehavior)
      .values({
        tenantId,
        anonymousId,
        userId: opts?.userId,
        userAgent: opts?.userAgent?.slice(0, 500),
        consent,
      })
      .returning();
    session = inserted[0]!;
  } else {
    await db
      .update(sessionsBehavior)
      .set({ lastSeen: new Date(), consent, userId: opts?.userId ?? session.userId })
      .where(eq(sessionsBehavior.id, session.id));
  }

  const rows = events.map((e) => ({
    tenantId,
    sessionId: session!.id,
    anonymousId,
    userId: opts?.userId ?? session!.userId ?? null,
    eventType: e.type,
    entityType: e.entityType,
    entityId: e.entityId as `${string}-${string}-${string}-${string}-${string}` | undefined,
    metadata: {
      ...e.metadata,
      ts: e.ts,
      ...(opts?.ipAddress ? { ipHash: hashIp(opts.ipAddress) } : {}),
      ...(e.type === 'page_view' && utm?.source ? {
        utm_source: utm.source,
        utm_medium: utm.medium ?? null,
        utm_campaign: utm.campaign ?? null,
      } : {}),
    },
  }));

  try {
    await db.insert(behaviorEvents).values(rows);
  } catch (err) {
    logger.error({ err, count: rows.length }, 'falha ao gravar behavior_events');
    throw err;
  }

  return { accepted: rows.length, sessionId: session.id };
}

/**
 * Link anonymous tracking trail to authenticated user.
 *
 * Called when client logs in: backfills userId em behavior_sessions e behavior_events
 * matching anonymousId+tenantId where userId IS NULL. Idempotente.
 */
export async function linkIdentity(args: {
  tenantId: string;
  anonymousId: string;
  userId: string;
}): Promise<{ sessionsUpdated: number; eventsUpdated: number }> {
  const { tenantId, anonymousId, userId } = args;
  if (!tenantId || !anonymousId || !userId) {
    return { sessionsUpdated: 0, eventsUpdated: 0 };
  }

  const sessionRows = await db
    .update(sessionsBehavior)
    .set({ userId, lastSeen: new Date() })
    .where(
      and(
        eq(sessionsBehavior.tenantId, tenantId),
        eq(sessionsBehavior.anonymousId, anonymousId),
      ),
    )
    .returning({ id: sessionsBehavior.id });

  const eventRows = await db
    .update(behaviorEvents)
    .set({ userId })
    .where(
      and(
        eq(behaviorEvents.tenantId, tenantId),
        eq(behaviorEvents.anonymousId, anonymousId),
        isNull(behaviorEvents.userId),
      ),
    )
    .returning({ id: behaviorEvents.id });

  return { sessionsUpdated: sessionRows.length, eventsUpdated: eventRows.length };
}
