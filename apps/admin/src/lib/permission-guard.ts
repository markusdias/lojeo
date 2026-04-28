import { NextResponse } from 'next/server';
import { requirePermission } from './roles';
import type { Scope } from '@lojeo/db';

/**
 * Helper compartilhado: tenta requirePermission, retorna NextResponse 403
 * em caso de erro, ou null pra prosseguir. Skip em NODE_ENV=test pra
 * preservar dogfood tests sem auth setup.
 *
 * Uso:
 *   const denied = await guardPermission('products', 'write');
 *   if (denied) return denied;
 */
export async function guardPermission(
  scope: Scope,
  action: 'read' | 'write',
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    const { auth } = await import('../auth');
    const session = await auth();
    await requirePermission(session, scope, action);
    return null;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
}
