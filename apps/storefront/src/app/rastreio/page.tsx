import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

async function lookupAction(formData: FormData) {
  'use server';
  const raw = (formData.get('code') ?? '').toString().trim().toUpperCase();
  if (!raw) {
    redirect('/rastreio?error=empty');
  }
  redirect(`/rastreio/${encodeURIComponent(raw)}`);
}

export default async function RastreioFormPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  // Permite o NotFoundView reaproveitar o form via GET ?code=...
  if (sp.code && sp.code.trim().length > 0) {
    redirect(`/rastreio/${encodeURIComponent(sp.code.trim().toUpperCase())}`);
  }

  return (
    <div style={{
      maxWidth: 'var(--container-max)', margin: '0 auto',
      padding: '64px var(--container-pad) 96px',
    }}>
      <div style={{
        maxWidth: 520, margin: '0 auto',
        background: 'var(--surface)', border: '1px solid var(--divider)',
        borderRadius: 12, padding: '48px 32px', textAlign: 'center',
      }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Rastreamento</p>
        <h1 style={{
          fontSize: 28, fontWeight: 500, marginBottom: 12,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
        }}>
          Acompanhe seu pedido
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
          Digite o número que aparece no email de confirmação. O formato é{' '}
          <strong>LJ-XXXXX</strong>.
        </p>

        <form action={lookupAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            name="code"
            placeholder="LJ-00042"
            autoComplete="off"
            required
            minLength={4}
            style={{
              width: '100%', padding: '16px 18px', fontSize: 16,
              background: 'var(--surface-sunken)', border: '1px solid var(--divider)',
              borderRadius: 8, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', textAlign: 'center', letterSpacing: '0.06em',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '14px 24px', fontSize: 14, fontWeight: 500,
              background: 'var(--text-primary)', color: 'var(--text-on-dark)',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Rastrear pedido
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          Não tem o número?{' '}
          <Link href="/conta/pedidos" style={{ color: 'var(--accent)' }}>
            Entrar na minha conta
          </Link>
        </p>
      </div>
    </div>
  );
}
