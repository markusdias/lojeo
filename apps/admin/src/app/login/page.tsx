import { signIn } from '../../auth';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const hasGoogle = !!process.env.AUTH_GOOGLE_ID;
  const isDev =
    process.env.NODE_ENV !== 'production' ||
    process.env.ADMIN_DEV_LOGIN === 'true';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--paper)',
        padding: 'var(--space-8)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '40px 36px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Logo Lojeo — match Screens.jsx Login */}
        <svg
          width="44"
          height="44"
          viewBox="0 0 56 56"
          aria-hidden
          style={{ marginBottom: 24 }}
        >
          <path
            d="M8 8 H44 V44 H20 a12 12 0 0 1 -12 -12 Z"
            fill="var(--accent)"
          />
          <circle cx="34" cy="20" r="4" fill="var(--paper)" />
        </svg>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 'var(--w-semibold)',
            letterSpacing: 'var(--track-tight)',
            margin: '0 0 6px',
            color: 'var(--fg)',
          }}
        >
          Entre no seu lojeo
        </h1>
        <p
          style={{
            color: 'var(--fg-secondary)',
            margin: '0 0 28px',
            fontSize: 'var(--text-body-s)',
          }}
        >
          Sua loja te espera.
        </p>

        {hasGoogle && (
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/dashboard' });
            }}
          >
            <button
              type="submit"
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 'var(--text-body)',
                fontWeight: 'var(--w-medium)',
                cursor: 'pointer',
                marginBottom: 8,
                transition: 'background 120ms',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
                />
                <path
                  fill="#FF3D00"
                  d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.5 0-14 4.4-17.7 10.2z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 43.5c4.9 0 9.4-1.9 12.8-4.9l-5.9-5c-2 1.3-4.4 2.1-6.9 2.1-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.7l5.9 5c-.4.4 6.3-4.6 6.3-14.7 0-1.2-.1-2.3-.4-3.5z"
                />
              </svg>
              Continuar com Google
            </button>
          </form>
        )}

        {isDev && (
          <>
            {hasGoogle && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '24px 0',
                  fontSize: 11,
                  color: 'var(--fg-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                <span
                  aria-hidden
                  style={{ flex: 1, height: 1, background: 'var(--border)' }}
                />
                <span>ou com e-mail</span>
                <span
                  aria-hidden
                  style={{ flex: 1, height: 1, background: 'var(--border)' }}
                />
              </div>
            )}

            <form
              action={async (fd: FormData) => {
                'use server';
                await signIn('dev-login', {
                  email: fd.get('email'),
                  redirectTo: '/dashboard',
                });
              }}
            >
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 'var(--w-medium)',
                  color: 'var(--neutral-700)',
                  margin: '10px 0 6px',
                }}
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                required
                placeholder="você@suamarca.com.br"
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  fontSize: 'var(--text-body)',
                  outline: 'none',
                  background: 'var(--bg-elevated)',
                  color: 'var(--fg)',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                className="lj-btn-primary"
                style={{
                  width: '100%',
                  height: 42,
                  marginTop: 12,
                  borderRadius: 8,
                }}
              >
                Entrar
              </button>
            </form>
          </>
        )}

        {!hasGoogle && !isDev && (
          <p
            style={{
              fontSize: 'var(--text-body-s)',
              color: 'var(--error)',
              marginTop: 16,
            }}
          >
            Nenhum provider configurado. Configure AUTH_GOOGLE_ID em produção.
          </p>
        )}

        <p
          style={{
            fontSize: 12,
            color: 'var(--fg-secondary)',
            marginTop: 24,
            textAlign: 'center',
          }}
        >
          Ainda não tem loja?{' '}
          <a
            href="https://lojeo.com/criar"
            style={{
              color: 'var(--accent)',
              fontWeight: 'var(--w-medium)',
              textDecoration: 'none',
            }}
          >
            Crie a sua em 2 minutos →
          </a>
        </p>
      </div>
    </div>
  );
}
