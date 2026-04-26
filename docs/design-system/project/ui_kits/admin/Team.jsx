// Team.jsx — Lojeo admin team & permissions
const { useState: useStateT } = React;

function Team() {
  const [filter, setFilter] = useStateT('todos');
  const members = [
    { name: 'Marina Castro',     email: 'marina@atelierverde.com',  role: 'owner',    last: 'agora',    twofa: true,  initials: 'MC', color: 'linear-gradient(135deg, #00553D, #34C796)' },
    { name: 'Lucas Andrade',     email: 'lucas@atelierverde.com',   role: 'admin',    last: 'há 12 min', twofa: true,  initials: 'LA', color: 'linear-gradient(135deg, #1D4ED8, #60A5FA)' },
    { name: 'Beatriz Lima',      email: 'beatriz@atelierverde.com', role: 'operator', last: 'há 2 h',   twofa: true,  initials: 'BL', color: 'linear-gradient(135deg, #BE123C, #FB7185)' },
    { name: 'Ricardo Souza',     email: 'rh@atelierverde.com',      role: 'editor',   last: 'há 1 dia', twofa: false, initials: 'RS', color: 'linear-gradient(135deg, #6D28D9, #A78BFA)' },
    { name: 'Camila Rocha',      email: 'cami@atelierverde.com',    role: 'support',  last: 'há 5 dias', twofa: true,  initials: 'CR', color: 'linear-gradient(135deg, #92400E, #FBBF24)' },
    { name: 'João Mendes',       email: 'fin@atelierverde.com',     role: 'finance',  last: 'há 3 dias', twofa: true,  initials: 'JM', color: 'linear-gradient(135deg, #134E4A, #2DD4BF)' },
  ];
  const ROLE_LABEL = {
    owner: 'Proprietário', admin: 'Admin', operator: 'Operador',
    editor: 'Editor', support: 'Atendimento', finance: 'Financeiro',
  };
  const filtered = filter === 'todos' ? members : members.filter(m => m.role === filter);

  return (
    <main className="main">
      <div className="page-header">
        <div>
          <h1>Equipe e permissões</h1>
          <p className="sub">{members.length} pessoas com acesso · 5 com 2FA ativo</p>
        </div>
        <div className="actions">
          <button className="btn secondary">Exportar log de acessos</button>
          <button className="btn primary">+ Convidar por e-mail</button>
        </div>
      </div>

      <div className="team-bar">
        <span style={{ fontSize: 12, color: 'var(--fg-secondary)', fontWeight: 500 }}>Filtrar:</span>
        {[
          ['todos', 'Todos', members.length],
          ['admin', 'Admins', 1],
          ['operator', 'Operadores', 1],
          ['editor', 'Editores', 1],
          ['support', 'Atendimento', 1],
          ['finance', 'Financeiro', 1],
        ].map(([id, label, n]) => (
          <button key={id} className={`filter-chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
            {label}<span style={{ opacity: 0.6 }}>· {n}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" style={{ marginLeft: 4 }}/></th>
              <th>Membro</th>
              <th>Função</th>
              <th>Último acesso</th>
              <th>Segurança</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.email}>
                <td><input type="checkbox" style={{ marginLeft: 4 }}/></td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                    <div className="avatar-sm" style={{ background: m.color }}>{m.initials}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`role-badge role-${m.role}`}>{ROLE_LABEL[m.role]}</span></td>
                <td style={{ color: 'var(--fg-secondary)' }}>{m.last}</td>
                <td>
                  <span className={`shield-2fa ${m.twofa ? 'on' : 'off'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>{m.twofa && <path d="m9 12 2 2 4-4"/>}</svg>
                    {m.twofa ? '2FA ativo' : 'Sem 2FA'}
                  </span>
                </td>
                <td>
                  <button className="btn ghost sm" style={{ width: 28, padding: 0, height: 28 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Funções disponíveis</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { role: 'owner',    label: 'Proprietário', desc: 'Único · acesso total · única conta que pode encerrar a loja' },
            { role: 'admin',    label: 'Admin',        desc: 'Acesso total exceto fechar a loja ou alterar plano' },
            { role: 'operator', label: 'Operador',     desc: 'Pedidos, estoque, etiquetas, atendimento — sem mexer em finanças' },
            { role: 'editor',   label: 'Editor',       desc: 'Catálogo + páginas + e-mails · sem ver receita ou clientes' },
            { role: 'support',  label: 'Atendimento',  desc: 'Tickets, devoluções, ver pedidos · sem editar produtos' },
            { role: 'finance',  label: 'Financeiro',   desc: 'Relatórios, NF-e, conciliação · sem ler tickets de clientes' },
          ].map(r => (
            <div key={r.role} className="card" style={{ padding: 14 }}>
              <span className={`role-badge role-${r.role}`}>{r.label}</span>
              <p style={{ fontSize: 12, color: 'var(--fg-secondary)', margin: '8px 0 0', lineHeight: 1.5 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

window.Team = Team;
