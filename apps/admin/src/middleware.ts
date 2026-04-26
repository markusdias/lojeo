import { NextResponse, type NextRequest } from 'next/server';
import { auth } from './auth';

// CSRF protection: bloqueia mutações cross-origin sem allowlist
// Defesa em profundidade — NextAuth já protege sessão, isso evita SOP bypass
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS ?? '';
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string, host: string): boolean {
  // Same-host: aceitar (request originada do próprio admin)
  try {
    const url = new URL(origin);
    if (url.host === host) return true;
  } catch { return false; }
  return ALLOWED_ORIGINS.includes(origin);
}

function csrfCheck(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!STATE_CHANGING_METHODS.has(method)) return null;

  const path = req.nextUrl.pathname;
  // Liberar /api/migrate (bootstrap interno, sem session)
  if (path === '/api/migrate') return null;
  // Webhooks externos genuínos (futuro): exemptar via allowlist de paths
  if (path.startsWith('/api/webhooks/')) return null;

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host') ?? '';

  // Aceitar requests sem origin/referer apenas para fetches GET (já filtramos acima)
  // Para mutações, exigir pelo menos um dos dois
  if (!origin && !referer) {
    return NextResponse.json({ error: 'csrf_origin_required' }, { status: 403 });
  }

  const checkSource = origin ?? referer ?? '';
  if (!isAllowedOrigin(checkSource, host)) {
    return NextResponse.json({ error: 'csrf_origin_blocked', origin: checkSource }, { status: 403 });
  }

  return null;
}

export default auth((req) => {
  const csrfBlock = csrfCheck(req);
  if (csrfBlock) return csrfBlock;
  // delega ao auth handler default (sessão)
  return undefined as unknown as NextResponse;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/migrate).*)'],
};
