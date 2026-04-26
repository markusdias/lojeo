import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Lojeo Admin',
  description: 'Painel administrativo Lojeo',
};

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/pedidos', label: 'Pedidos', icon: '📦' },
  { href: '/products', label: 'Produtos', icon: '◆' },
  { href: '/inventory', label: 'Estoque', icon: '◻' },
  { href: '/collections', label: 'Coleções', icon: '▦' },
  { href: '/tickets', label: 'Suporte', icon: '💬' },
  { href: '/chatbot', label: 'Chatbot', icon: '🤖' },
  { href: '/ugc', label: 'Galeria UGC', icon: '📷' },
  { href: '/garantias', label: 'Garantias', icon: '🛡' },
  { href: '/experiments', label: 'Experimentos', icon: '🧪' },
  { href: '/avaliacoes', label: 'Avaliações', icon: '★' },
  { href: '/clientes', label: 'Clientes', icon: '◉' },
  { href: '/insights', label: 'Insights', icon: '◬' },
  { href: '/ia-uso', label: 'Uso de IA', icon: '✦' },
  { href: '/settings', label: 'Configurações', icon: '⚙' },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ display: 'flex', minHeight: '100vh', margin: 0 }}>
        {/* Sidebar — Lojeo dark surface */}
        <aside style={{
          width: 'var(--sidebar-w)',
          flexShrink: 0,
          background: 'var(--neutral-900)',
          color: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Brand */}
          <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-4)', borderBottom: '1px solid var(--neutral-800)' }}>
            <div style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', color: '#FFFFFF' }}>
              Lojeo
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--neutral-300)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', marginTop: 2 }}>
              Admin
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: 'var(--space-3) 0' }}>
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-5)',
                  fontSize: 'var(--text-body-s)',
                  color: 'var(--neutral-300)',
                  textDecoration: 'none',
                  transition: `color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)`,
                }}
                className="lj-nav-item"
              >
                <span style={{ fontSize: 14, color: 'var(--neutral-400)', width: 20, display: 'inline-block', textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--neutral-800)' }}>
            <Link href="/api/auth/signout" style={{ fontSize: 'var(--text-caption)', color: 'var(--neutral-300)', textDecoration: 'none' }}>
              Sair
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
