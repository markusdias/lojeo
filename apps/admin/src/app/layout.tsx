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
  { href: '/avaliacoes', label: 'Avaliações', icon: '★' },
  { href: '/clientes', label: 'Clientes', icon: '◉' },
  { href: '/insights', label: 'Insights', icon: '◬' },
  { href: '/ia-uso', label: 'Uso de IA', icon: '✦' },
  { href: '/settings', label: 'Configurações', icon: '⚙' },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-neutral-900 text-white flex flex-col">
          {/* Logo */}
          <div className="px-5 py-4 border-b border-neutral-800">
            <span className="text-lg font-semibold tracking-tight">Lojeo</span>
            <span className="text-xs text-neutral-400 block">Admin</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <span className="text-neutral-500">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-neutral-800">
            <Link href="/api/auth/signout" className="text-xs text-neutral-500 hover:text-neutral-300">
              Sair
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 overflow-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
