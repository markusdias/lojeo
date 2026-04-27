'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badgeKey?: keyof BadgeCounts;
}
interface NavSection { title?: string; items: NavItem[] }

interface BadgeCounts {
  pedidos: number;
  ugc: number;
  tickets: number;
  devolucoes: number;
}

// SVG icons inspired by Lucide outline style — paridade design oficial
const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const I = {
  home: 'M3 12 12 3l9 9M5 10v10h14V10',
  cart: 'M2 4h2.5l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L20.5 8H6.2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  box: 'm21 8-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8',
  users: 'M16 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-6 2.2-6 5v1h12v-1c0-2.8-2.7-5-6-5Z',
  chart: 'M3 3v18h18M7 14l3-3 3 3 5-5',
  sparkles: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  gallery: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  palette: 'M12 3a9 9 0 1 0 0 18 3 3 0 0 0 3-3v-2a2 2 0 0 1 2-2h2a2 2 0 0 0 2-2 9 9 0 0 0-9-9Z',
  gear: 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8c.2.6.7 1 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ticket: 'M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Zm6-1v2m0 4v2',
  bot: 'M12 4v3M9 7h6M5 10h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8Zm4 4h.01M15 14h.01',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
  flask: 'M9 3h6M10 3v6L4 19a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3L14 9V3M7 14h10',
  star: 'm12 2 3.1 6.4 7 1-5 5 1.2 7-6.3-3.4L5.6 21l1.2-7-5-5 7-1L12 2Z',
  return: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8',
  coupon: 'M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4ZM9 7v10',
  squares: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  link: 'M9 17H7a5 5 0 0 1 0-10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8',
  globe: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18',
  inbox: 'M3 13h6l1 3h4l1-3h6M3 13V7l3-4h12l3 4v6M3 13v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
};

// Sidebar enxuto conforme design oficial Claude Design (10 itens em 3 sections).
// Pages secundárias (Devoluções/Cupons/Avaliações/Garantias/Estoque/Coleções/Tickets/Chatbot/
// Atribuição/Experimentos/CTR/Uso IA/Integrações) seguem acessíveis por URL direta e serão
// expostas via breadcrumbs e sub-navs internas das pages principais.
const SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <Icon d={I.home} /> },
      { href: '/pedidos', label: 'Pedidos', icon: <Icon d={I.cart} />, badgeKey: 'pedidos' },
      { href: '/filas', label: 'Filas', icon: <Icon d={I.inbox} /> },
      { href: '/products', label: 'Produtos', icon: <Icon d={I.box} /> },
      { href: '/clientes', label: 'Clientes', icon: <Icon d={I.users} /> },
      { href: '/insights', label: 'Análises', icon: <Icon d={I.chart} /> },
    ],
  },
  {
    title: 'IA & Conteúdo',
    items: [
      { href: '/ia-analyst', label: 'IA Analyst', icon: <Icon d={I.sparkles} /> },
      { href: '/ugc', label: 'Moderação UGC', icon: <Icon d={I.gallery} />, badgeKey: 'ugc' },
    ],
  },
  {
    title: 'Loja',
    items: [
      { href: '/wishlist', label: 'Demanda', icon: <Icon d={I.star} /> },
      { href: '/aparencia', label: 'Aparência', icon: <Icon d={I.palette} /> },
      { href: '/settings', label: 'Configurações', icon: <Icon d={I.gear} /> },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
  if (href === '/insights') return pathname.startsWith('/insights') || pathname.startsWith('/atribuicao');
  return pathname === href || pathname.startsWith(href + '/');
}

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  tenantLabel?: string;
  /** Subtítulo opcional do tenant (ex: "MEI", "Pro", "Free") — exibido após `·` no rodapé */
  tenantPlan?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Sidebar({ userName, userEmail, tenantLabel, tenantPlan }: SidebarProps = {}) {
  const pathname = usePathname() ?? '/';
  const [badges, setBadges] = useState<BadgeCounts>({ pedidos: 0, ugc: 0, tickets: 0, devolucoes: 0 });

  useEffect(() => {
    fetch('/api/sidebar/badges', { headers: { accept: 'application/json' } })
      .then(r => r.ok ? r.json() : null)
      .then((d: BadgeCounts | null) => {
        if (d) setBadges(d);
      })
      .catch(() => {});
  }, [pathname]);

  const display = userName ?? userEmail ?? 'Usuário';
  const storeLine = tenantLabel
    ? (tenantPlan ? `${tenantLabel} · ${tenantPlan}` : tenantLabel)
    : 'Admin';

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
      {/* Brand: leaf + lojeo */}
      <div style={{ padding: 'var(--space-5) var(--space-6) var(--space-4)' }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
            <path
              d="M21 5C13 5 7 9 5.5 17c0 .5 0 1 .2 1.5C7 12 12 9 21 8.5c.4 0 .5-.4.3-.7C20 6.4 18 5 13 5h8Z"
              fill="var(--accent)"
            />
            <path
              d="M6 18.5c2.5-2 5.5-3.5 9.5-4"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
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
              const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
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
                  <span className="lj-nav-icon" style={{ color: active ? 'var(--accent)' : 'var(--fg-muted)', display: 'inline-flex' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="numeric" style={{
                      fontSize: 'var(--text-caption)',
                      color: 'var(--fg-secondary)',
                      background: 'var(--neutral-50)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 'var(--w-medium)',
                    }}>
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: avatar + nome + role */}
      <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="lj-avatar" aria-hidden>{initials(display)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 'var(--text-body-s)', fontWeight: 'var(--w-medium)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {display}
            </p>
            <p className="caption" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {storeLine}
            </p>
          </div>
          <Link href="/api/auth/signout" aria-label="Sair" title="Sair" style={{ color: 'var(--fg-muted)', display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
}
