import type { ReactNode } from 'react';
import Link from 'next/link';
import { auth } from '../../auth';
import { signOut } from '../../auth';

const NAV = [
  { href: '/conta/pedidos', label: 'Meus pedidos' },
  { href: '/conta/enderecos', label: 'Endereços' },
  { href: '/wishlist', label: 'Lista de desejos' },
];

export default async function ContaLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? 'Cliente';

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '48px var(--container-pad) 80px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, alignItems: 'start' }}>
      {/* Sidebar */}
      <aside>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{name}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>{session?.user?.email}</p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{ fontSize: 14, color: 'var(--text-primary)', padding: '8px 0', borderBottom: '1px solid var(--divider)' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
          style={{ marginTop: 24 }}
        >
          <button
            type="submit"
            style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Sair
          </button>
        </form>
      </aside>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
