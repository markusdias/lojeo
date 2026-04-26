import Link from 'next/link';
import { auth } from '../auth';

export default async function Home() {
  const session = await auth();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Lojeo Admin</h1>
        {session?.user ? (
          <>
            <p className="text-neutral-600">
              Olá, <strong>{session.user.email}</strong>
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-neutral-900 text-white px-4 py-2 rounded"
            >
              Ir para o dashboard
            </Link>
          </>
        ) : (
          <>
            <p className="text-neutral-600">Painel administrativo do sistema Lojeo.</p>
            <Link href="/login" className="inline-block bg-neutral-900 text-white px-4 py-2 rounded">
              Entrar
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
