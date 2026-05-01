import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse, type NextRequest } from 'next/server';

// Edge-compatible auth instance (no DB adapter)
const { auth } = NextAuth(authConfig);

// Paths que escapam do bloqueio de manutenção mesmo com loja offline.
// /api/ e /_next/ já estão fora do matcher; estes são paths de página que
// precisam continuar respondendo:
//   - /manutencao: a própria página de manutenção
//   - /r/: redirect de afiliado (last-touch attribution preservada)
const MAINTENANCE_PASSTHROUGH = ['/manutencao', '/r/'];
const BYPASS_COOKIE = 'lojeo_maintenance_bypass';

interface MaintenancePayload {
  enabled: boolean;
  message?: string;
  bypassToken?: string;
}

async function fetchMaintenance(req: NextRequest): Promise<MaintenancePayload> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return { enabled: false }; // fail open
  try {
    const r = await fetch(new URL('/api/internal/maintenance', req.nextUrl.origin), {
      headers: { 'x-internal-token': secret },
      cache: 'no-store',
    });
    if (!r.ok) return { enabled: false };
    return (await r.json()) as MaintenancePayload;
  } catch {
    return { enabled: false };
  }
}

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;

  // Manutenção: check primeiro, antes do auth gate.
  const isPassthrough = MAINTENANCE_PASSTHROUGH.some(p => path === p || path.startsWith(p));
  if (!isPassthrough) {
    const maint = await fetchMaintenance(req);
    if (maint.enabled) {
      // Cookie bypass válido?
      const cookie = req.cookies.get(BYPASS_COOKIE)?.value;
      const hasValidCookie = Boolean(cookie && maint.bypassToken && cookie === maint.bypassToken);

      if (!hasValidCookie) {
        // Tem ?_preview=<token> na URL? Encaminha pro stamp endpoint pra setar cookie.
        const tokenParam = req.nextUrl.searchParams.get('_preview');
        if (tokenParam) {
          const stampUrl = new URL('/api/preview/stamp', req.nextUrl.origin);
          stampUrl.searchParams.set('token', tokenParam);
          stampUrl.searchParams.set('redirect', path);
          return NextResponse.redirect(stampUrl, 302);
        }
        // Sem bypass: redirect 307 → /manutencao com cabeçalhos noindex + no-cache.
        const res = NextResponse.redirect(new URL('/manutencao', req.url), 307);
        res.headers.set('X-Robots-Tag', 'noindex, nofollow');
        res.headers.set('Cache-Control', 'no-store');
        return res;
      }
    }
  }

  // Fluxo auth normal
  if (path.startsWith('/conta') && !isLoggedIn) {
    const url = new URL('/entrar', req.url);
    url.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
