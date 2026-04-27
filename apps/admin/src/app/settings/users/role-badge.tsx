'use client';

const ROLE_STYLES: Record<string, { bg: string; fg: string }> = {
  owner: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  admin: { bg: 'rgba(29, 78, 216, 0.10)', fg: '#1D4ED8' },
  operador: { bg: 'rgba(190, 18, 60, 0.10)', fg: '#BE123C' },
  editor: { bg: 'rgba(109, 40, 217, 0.10)', fg: '#6D28D9' },
  atendimento: { bg: 'rgba(146, 64, 14, 0.10)', fg: '#92400E' },
  financeiro: { bg: 'rgba(19, 78, 74, 0.10)', fg: '#134E4A' },
};

export function RoleBadge({ role, label }: { role: string; label: string }) {
  const s = ROLE_STYLES[role] ?? { bg: 'var(--neutral-50)', fg: 'var(--neutral-500)' };
  return (
    <span
      className="lj-badge"
      style={{ background: s.bg, color: s.fg }}
    >
      {label}
    </span>
  );
}
