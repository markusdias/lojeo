'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type SettingsTab =
  | 'identidade'
  | 'pagamentos'
  | 'frete'
  | 'fiscal'
  | 'email'
  | 'whatsapp'
  | 'pixels'
  | 'notificacoes'
  | 'ia'
  | 'comercial'
  | 'robots'
  | 'equipe'
  | 'jobs';

interface TabItem {
  id: SettingsTab;
  label: string;
  iconPath: string;
  group: string;
  href?: string;
}

// Lucide-style icon paths
const ICONS = {
  store: 'M3 9l1-5h16l1 5M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M9 21v-6h6v6',
  card: 'M2 6h20v13H2zM2 11h20',
  truck: 'M1 3h15v13H1zM16 8h4l3 5v3h-7M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  receipt: 'M5 2v20l3-2 3 2 3-2 3 2 3-2V2M8 7h8M8 11h8M8 15h5',
  mail: 'M2 4h20v16H2zM2 6l10 7 10-7',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  spark: 'M12 3 13.8 8.4 19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z',
  users: 'M9 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 20a6 6 0 0 1 12 0M17 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14 20a4 4 0 0 1 7 0',
  palette: 'M12 3a9 9 0 1 0 0 18 3 3 0 0 0 3-3v-2a2 2 0 0 1 2-2h2a2 2 0 0 0 2-2 9 9 0 0 0-9-9Z',
  tag: 'M20 12V4h-8L4 12l8 8z M7 7h.01',
  globe: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18',
  bell: 'M9 2v.5M5.25 5.25v3.5l-1 2.25h9.5l-1-2.25v-3.5a3.75 3.75 0 1 0-7.5 0ZM7.5 13a1.5 1.5 0 0 0 3 0',
};

const TABS: TabItem[] = [
  { id: 'identidade', label: 'Identidade da loja', iconPath: ICONS.store, group: 'Loja' },
  { id: 'aparencia' as SettingsTab, label: 'Aparência ↗', iconPath: ICONS.palette, group: 'Loja', href: '/aparencia' },
  { id: 'pagamentos', label: 'Gateways', iconPath: ICONS.card, group: 'Vendas' },
  { id: 'frete', label: 'Frete', iconPath: ICONS.truck, group: 'Vendas' },
  { id: 'fiscal', label: 'Fiscal e ERP', iconPath: ICONS.receipt, group: 'Vendas' },
  { id: 'comercial', label: 'Políticas comerciais', iconPath: ICONS.tag, group: 'Vendas' },
  { id: 'email', label: 'E-mail', iconPath: ICONS.mail, group: 'Comunicação' },
  { id: 'whatsapp', label: 'WhatsApp', iconPath: ICONS.bell, group: 'Comunicação' },
  { id: 'pixels', label: 'Pixels & Analytics', iconPath: ICONS.target, group: 'Comunicação' },
  { id: 'notificacoes', label: 'Notificações', iconPath: ICONS.bell, group: 'Comunicação' },
  { id: 'ia', label: 'IA · cota', iconPath: ICONS.spark, group: 'Inteligência' },
  { id: 'jobs', label: 'Jobs assíncronos', iconPath: ICONS.bell, group: 'Inteligência' },
  { id: 'robots', label: 'Robots.txt', iconPath: ICONS.globe, group: 'SEO' },
  { id: 'equipe', label: 'Equipe', iconPath: ICONS.users, group: 'Conta', href: '/settings/users' },
];

interface Props {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function SettingsSidebar({ active, onChange }: Props) {
  // Group tabs by group label
  const grouped = TABS.reduce<Record<string, TabItem[]>>((acc, t) => {
    if (!acc[t.group]) acc[t.group] = [];
    acc[t.group]!.push(t);
    return acc;
  }, {});

  return (
    <nav style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      padding: 'var(--space-4) 0',
      width: 240,
      flexShrink: 0,
      position: 'sticky',
      top: 'var(--space-6)',
      alignSelf: 'flex-start',
    }}>
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <p style={{
            fontSize: 'var(--text-caption)',
            fontWeight: 'var(--w-medium)',
            color: 'var(--fg-muted)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--track-wide)',
            marginBottom: 'var(--space-2)',
            paddingLeft: 'var(--space-3)',
          }}>
            {group}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map(t => {
              const isActive = active === t.id;
              const baseStyle: React.CSSProperties = {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--text-body-s)',
                fontWeight: isActive ? 'var(--w-semibold)' : 'var(--w-medium)',
                color: isActive ? 'var(--fg)' : 'var(--fg-secondary)',
                background: isActive ? 'var(--neutral-100)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                textDecoration: 'none',
                transition: 'background 120ms, color 120ms',
              };

              if (t.href) {
                return (
                  <Link key={t.id} href={t.href} style={baseStyle}>
                    <Icon d={t.iconPath} />
                    {t.label}
                  </Link>
                );
              }

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange(t.id)}
                  style={baseStyle}
                >
                  <Icon d={t.iconPath} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// URL hash sync helper
export function useTabHash(initial: SettingsTab = 'identidade'): [SettingsTab, (t: SettingsTab) => void] {
  const [tab, setTab] = useState<SettingsTab>(initial);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && TABS.find(t => t.id === hash)) {
      setTab(hash as SettingsTab);
    }
    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h && TABS.find(t => t.id === h)) {
        setTab(h as SettingsTab);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setTabSync = (t: SettingsTab) => {
    setTab(t);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${t}`);
    }
  };

  return [tab, setTabSync];
}
