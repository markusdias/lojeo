'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TopbarProps {
  userName?: string;
  userEmail?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pedidos: 'Pedidos',
  devolucoes: 'Devoluções',
  cupons: 'Cupons',
  products: 'Produtos',
  inventory: 'Estoque',
  collections: 'Coleções',
  tickets: 'Suporte',
  templates: 'Templates',
  chatbot: 'Chatbot',
  ugc: 'Galeria UGC',
  garantias: 'Garantias',
  experiments: 'Experimentos',
  results: 'Resultados',
  avaliacoes: 'Avaliações',
  clientes: 'Clientes',
  insights: 'Insights',
  atribuicao: 'Atribuição',
  recomendacoes: 'Recomendações',
  ctr: 'CTR',
  'ia-analyst': 'IA Analyst',
  'ia-uso': 'Uso de IA',
  integracoes: 'Integrações',
  settings: 'Configurações',
  users: 'Usuários',
  '2fa': '2FA',
  audit: 'Auditoria',
  appearance: 'Aparência',
};

function pretty(seg: string): string {
  if (ROUTE_LABELS[seg]) return ROUTE_LABELS[seg];
  if (/^[0-9a-f]{8}-/.test(seg)) return seg.slice(0, 8);
  return seg;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Topbar({ userName, userEmail }: TopbarProps) {
  const pathname = usePathname() ?? '/';
  const [query, setQuery] = useState('');

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    label: pretty(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
    last: i === segments.length - 1,
  }));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const el = document.getElementById('lj-topbar-search') as HTMLInputElement | null;
        el?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const display = userName ?? userEmail ?? 'Usuário';

  return (
    <header className="lj-topbar">
      <nav className="lj-breadcrumb" aria-label="Trilha de navegação">
        {crumbs.length === 0 && <span className="lj-breadcrumb-current">Início</span>}
        {crumbs.map((c, i) => (
          <span key={c.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span className="lj-breadcrumb-sep" aria-hidden>/</span>}
            {c.last ? (
              <span className="lj-breadcrumb-current">{c.label}</span>
            ) : (
              <Link href={c.href}>{c.label}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="lj-search">
        <span className="lj-search-icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id="lj-topbar-search"
          type="search"
          placeholder="Pedido, cliente, SKU…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Busca rápida"
        />
      </div>

      <button className="lj-icon-btn" aria-label="Notificações" type="button">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2v.5M5.25 5.25v3.5l-1 2.25h9.5l-1-2.25v-3.5a3.75 3.75 0 1 0-7.5 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7.5 13a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className="lj-avatar" aria-hidden>{initials(display)}</span>
        <span style={{ fontSize: 'var(--text-body-s)', fontWeight: 'var(--w-medium)', color: 'var(--fg)' }}>{display}</span>
      </div>
    </header>
  );
}
