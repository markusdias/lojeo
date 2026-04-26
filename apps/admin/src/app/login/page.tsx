import { signIn } from '../../auth';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const hasGoogle = !!process.env.AUTH_GOOGLE_ID;
  const isDev = process.env.NODE_ENV !== 'production' || process.env.ADMIN_DEV_LOGIN === 'true';
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-50">
      <div className="max-w-sm w-full bg-white rounded-lg shadow p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Entrar</h1>
          <p className="text-sm text-neutral-600 mt-1">Acesse o painel Lojeo</p>
        </div>

        {hasGoogle && (
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/dashboard' });
            }}
          >
            <button
              type="submit"
              className="w-full bg-neutral-900 text-white py-2 rounded font-medium hover:bg-neutral-800"
            >
              Continuar com Google
            </button>
          </form>
        )}

        {isDev && (
          <form
            action={async (fd: FormData) => {
              'use server';
              await signIn('dev-login', {
                email: fd.get('email'),
                redirectTo: '/dashboard',
              });
            }}
            className="space-y-3 border-t pt-6"
          >
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Modo dev</p>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@lojeo.dev"
              className="w-full px-3 py-2 border rounded"
            />
            <button
              type="submit"
              className="w-full bg-neutral-100 text-neutral-900 py-2 rounded font-medium hover:bg-neutral-200"
            >
              Entrar (dev)
            </button>
          </form>
        )}

        {!hasGoogle && !isDev && (
          <p className="text-sm text-red-600">
            Nenhum provider configurado. Configure AUTH_GOOGLE_ID em produção.
          </p>
        )}
      </div>
    </main>
  );
}
