import { NextResponse } from 'next/server';
import { db, chatbotSessions } from '@lojeo/db';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [counts] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        escalated: sql<number>`COUNT(*) FILTER (WHERE escalated = true)`,
        avgMsgs: sql<number>`COALESCE(AVG(msg_count), 0)`,
        totalTokensIn: sql<number>`COALESCE(SUM(total_tokens_in), 0)`,
        totalTokensOut: sql<number>`COALESCE(SUM(total_tokens_out), 0)`,
      })
      .from(chatbotSessions)
      .where(and(eq(chatbotSessions.tenantId, TENANT_ID), gte(chatbotSessions.createdAt, since)));

    const total = Number(counts?.total ?? 0);
    const escalated = Number(counts?.escalated ?? 0);
    const resolved = total - escalated;
    const escalationRate = total > 0 ? escalated / total : 0;
    const resolutionRate = total > 0 ? resolved / total : 0;

    // Top tools used (proxy for top topics)
    const topTopicsRaw = await db
      .select({ topic: sql<string>`jsonb_array_elements_text(topics)`, n: sql<number>`COUNT(*)` })
      .from(chatbotSessions)
      .where(and(eq(chatbotSessions.tenantId, TENANT_ID), gte(chatbotSessions.createdAt, since)))
      .groupBy(sql`jsonb_array_elements_text(topics)`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    return NextResponse.json({
      windowDays: 30,
      total,
      resolved,
      escalated,
      resolutionRate: Number(resolutionRate.toFixed(3)),
      escalationRate: Number(escalationRate.toFixed(3)),
      avgMsgs: Number(counts?.avgMsgs ?? 0),
      totalTokensIn: Number(counts?.totalTokensIn ?? 0),
      totalTokensOut: Number(counts?.totalTokensOut ?? 0),
      topTopics: topTopicsRaw.map(r => ({ topic: r.topic, count: Number(r.n) })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, total: 0, escalated: 0, resolved: 0, topTopics: [] }, { status: 500 });
  }
}
