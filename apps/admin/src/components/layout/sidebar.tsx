'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem { href: string; label: string; icon: string }
interface NavSection { title?: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '◈' },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { href: '/pedidos', label: 'Pedidos', icon: '📦' },
      { href: '/devolucoes', label: 'Devoluções', icon: '↩' },
      { href: '/cupons', label: 'Cupons', icon: '🎟' },
      { href: '/clientes', label: 'Clientes', icon: '◉' },
      { href: '/avaliacoes', label: 'Avaliações', icon: '★' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/products', label: 'Produtos', icon: '◆' },
      { href: '/inventory', label: 'Estoque', icon: '◻' },
      { href: '/collections', label: 'Coleções', icon: '▦' },
      { href: '/garantias', label: 'Garantias', icon: '🛡' },
    ],
  },
  {
    title: 'Atendimento',
    items: [
      { href: '/tickets', label: 'Suporte', icon: '💬' },
      { href: '/chatbot', label: 'Chatbot', icon: '🤖' },
      { href: '/ugc', label: 'Galeria UGC', icon: '📷' },
    ],
  },
  {
    title: 'Análises',
    items: [
      { href: '/insights', label: 'Insights', icon: '◬' },
      { href: '/atribuicao', label: 'Atribuição', icon: '◉' },
      { href: '/experiments', label: 'Experimentos', icon: '🧪' },
      { href: '/recomendacoes/ctr', label: 'CTR Recomendações', icon: '◈' },
    ],
  },
  {
    title: 'IA & Conteúdo',
    items: [
      { href: '/ia-analyst', label: 'IA Analyst', icon: '✦' },
      { href: '/ia-uso', label: 'Uso de IA', icon: '✦' },
    ],
  },
  {
    title: 'Loja',
    items: [
      { href: '/integracoes', label: 'Integrações', icon: '◉' },
      { href: '/settings', label: 'Configurações', icon: '⚙' },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar() {
  const pathname = usePathname() ?? '/';

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      flexShrink: 0,
      background: 'var(--bg-elevated)',
      color: 'var(--fg)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border)',
    }}>
      <div style={{ padding: 'var(--space-5) var(--space-6) var(--space-4)' }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span aria-hidden style={{
            width: 24,
            height: 24,
            background: 'var(--accent)',
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
          }}>l</span>
          <span style={{
            fontSize: 'var(--text-h4)',
            fontWeight: 'var(--w-semibold)',
            letterSpacing: 'var(--track-tight)',
            color: 'var(--accent)',
          }}>lojeo</span>
        </Link>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--space-4)' }}>
        {SECTIONS.map((section, idx) => (
          <div key={idx}>
            {section.title && <div className="lj-section-label">{section.title}</div>}
            {section.items.map(item => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? 'lj-nav-item lj-nav-item-active' : 'lj-nav-item'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    fontSize: 'var(--text-body-s)',
                    color: 'var(--fg-secondary)',
                    textDecoration: 'none',
                    transition: 'color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)',
                  }}
                >
                  <span className="lj-nav-icon" style={{ fontSize: 14, color: 'var(--fg-muted)', width: 20, display: 'inline-block', textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: 'var(--space-3) var(--space-6)', borderTop: '1px solid var(--border)' }}>
        <Link href="/api/auth/signout" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', textDecoration: 'none' }}>
          Sair
        </Link>
      </div>
    </aside>
  );
}
