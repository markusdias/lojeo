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

// 2FA enforcement (Sprint 5)
// Paths que NÃO exigem 2FA verificado (mesmo com 2FA habilitado):
// - /login e /api/auth/* (fluxo de signIn)
// - /api/2fa/challenge (a própria verificação)
// - /login/2fa-challenge (a página do challenge)
// - /api/health, /api/migrate (já liberados pelo matcher)
const TWO_FA_BYPASS_PREFIXES = [
  '/login',
  '/api/auth',
  '/api/2fa/challenge',
];

function needs2FAGate(pathname: string): boolean {
  for (const prefix of TWO_FA_BYPASS_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return false;
  }
  return true;
}

// Mutações em rotas /api/* exigem sessão. Allowlist mantém endpoints públicos
// (auth flow, webhooks externos, track behavioral, migrate bootstrap).
const API_AUTH_ALLOWLIST_PREFIXES = [
  '/api/auth/',
  '/api/migrate',
  '/api/health',
  '/api/track',
  '/api/events',
  '/api/webhooks/',
];

function needsApiAuth(pathname: string, method: string): boolean {
  if (!pathname.startsWith('/api/')) return false;
  for (const prefix of API_AUTH_ALLOWLIST_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix)) return false;
  }
  return STATE_CHANGING_METHODS.has(method.toUpperCase());
}

export default auth((req) => {
  const csrfBlock = csrfCheck(req);
  if (csrfBlock) return csrfBlock;

  // Auth gate /api/* mutações — defesa em profundidade. Endpoints individuais
  // ainda devem checar permission scope quando aplicável.
  const session = req.auth;
  const pathname = req.nextUrl.pathname;
  if (needsApiAuth(pathname, req.method) && !session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2FA enforcement: usuários com 2FA habilitado precisam ter verificado
  // a sessão (cookie lojeo_2fa_verified=1) antes de acessar rotas protegidas.
  const requires2FA = session?.user?.requires2FA === true;
  if (session?.user && requires2FA && needs2FAGate(pathname)) {
    const verified = req.cookies.get('lojeo_2fa_verified')?.value === '1';
    if (!verified) {
      const url = req.nextUrl.clone();
      url.pathname = '/login/2fa-challenge';
      url.searchParams.set('returnTo', pathname + (req.nextUrl.search || ''));
      return NextResponse.redirect(url);
    }
  }

  // delega ao auth handler default (sessão)
  return undefined as unknown as NextResponse;
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/migrate).*)'],
};
