'use client';

import { RoleBadge } from './role-badge';

const ROLES_DETAIL: Array<{ role: string; label: string; desc: string }> = [
  { role: 'owner', label: 'Owner', desc: 'Único · acesso total · única conta que pode encerrar a loja ou alterar plano' },
  { role: 'admin', label: 'Admin', desc: 'Acesso total exceto fechar a loja ou alterar plano de assinatura' },
  { role: 'operador', label: 'Operador', desc: 'Pedidos, estoque, etiquetas, atendimento — sem mexer em finanças' },
  { role: 'editor', label: 'Editor', desc: 'Catálogo, páginas e e-mails · sem ver receita ou clientes' },
  { role: 'atendimento', label: 'Atendimento', desc: 'Tickets, devoluções, ver pedidos · sem editar produtos' },
  { role: 'financeiro', label: 'Financeiro', desc: 'Relatórios, NF-e, conciliação · sem ler tickets de clientes' },
];

export function RoleCards() {
  return (
    <section style={{ marginTop: 8 }}>
      <h2 className="body-s font-semibold mb-3">Funções disponíveis</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {ROLES_DETAIL.map(r => (
          <div key={r.role} className="lj-card" style={{ padding: 14 }}>
            <RoleBadge role={r.role} label={r.label} />
            <p
              className="caption"
              style={{ margin: '8px 0 0', lineHeight: 1.5 }}
            >
              {r.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
