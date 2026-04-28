import { NextRequest, NextResponse } from 'next/server';
import { db, npsResponses } from '@lojeo/db';
import { and, eq, gte, desc } from 'drizzle-orm';
import { computeNps } from '@lojeo/engine';
import { TENANT_ID } from '../../../lib/roles';
import { authorizeCronRequest } from '../../../lib/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/nps?days=90&limit=20
 *
 * Retorna agregação NPS últimos N dias + últimas respostas com comment.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') ?? 90)));
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 20)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const allResponses = await db
    .select({
      score: npsResponses.score,
      comment: npsResponses.comment,
      surveyTrigger: npsResponses.surveyTrigger,
      customerEmail: npsResponses.customerEmail,
      createdAt: npsResponses.createdAt,
    })
    .from(npsResponses)
    .where(
      and(
        eq(npsResponses.tenantId, TENANT_ID),
        gte(npsResponses.createdAt, since),
      ),
    )
    .orderBy(desc(npsResponses.createdAt));

  const npsAgg = computeNps(allResponses.map((r) => ({ score: r.score })));

  const recent = allResponses.slice(0, limit);

  return NextResponse.json({
    ok: true,
    days,
    summary: npsAgg,
    recent,
  });
}
