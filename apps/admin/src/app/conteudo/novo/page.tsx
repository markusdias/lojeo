import { NovoPostForm } from './novo-form';

export const dynamic = 'force-dynamic';

export default function NovoPostPage() {
  return (
    <main style={{ padding: 'var(--space-7)', maxWidth: 980, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', marginBottom: 4 }}>Novo post</h1>
        <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-body-s)' }}>
          Comece com um tópico — a IA gera um draft. Você revisa, ajusta e publica.
        </p>
      </header>
      <NovoPostForm />
    </main>
  );
}
