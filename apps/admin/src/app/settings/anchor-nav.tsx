'use client';

import { useEffect, useState } from 'react';

interface AnchorItem {
  id: string;
  label: string;
  href?: string;
}

const ITEMS: AnchorItem[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'comercial', label: 'Políticas comerciais' },
  { id: 'brand-guide', label: 'Brand Guide IA' },
  { id: 'pixels', label: 'Pixels & Analytics' },
  { id: 'robots', label: 'Robots.txt' },
  { id: 'integracoes-link', label: 'Integrações ↗', href: '/integracoes' },
];

export function SettingsAnchorNav() {
  const [activeId, setActiveId] = useState<string>('identidade');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 },
    );
    for (const item of ITEMS) {
      if (item.href) continue;
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      padding: 'var(--space-3) 0',
      marginBottom: 'var(--space-2)',
      display: 'flex',
      gap: 'var(--space-4)',
      flexWrap: 'wrap',
    }}>
      {ITEMS.map(item => {
        const isActive = !item.href && item.id === activeId;
        return (
          <a
            key={item.id}
            href={item.href ?? `#${item.id}`}
            style={{
              fontSize: 'var(--text-body-s)',
              color: isActive ? 'var(--accent)' : 'var(--fg-secondary)',
              textDecoration: 'none',
              fontWeight: isActive ? 'var(--w-semibold)' : 'var(--w-medium)',
              whiteSpace: 'nowrap',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              paddingBottom: 4,
              marginBottom: -1,
              transition: 'color 120ms, border-color 120ms',
            }}
          >
            {item.label}
          </a>
        );
      })}
    </div>
  );
}
