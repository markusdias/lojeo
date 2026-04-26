import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
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
  const { tenantId, anonymousId, events, consent } = payload;
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
