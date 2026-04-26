// Sidebar.jsx — Lojeo admin navigation
const { useState } = React;

function Icon({ name, ...rest }) {
  const paths = {
    home: <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V9z"/>,
    package: <><path d="M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></>,
    cart: <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart: <path d="M3 3v18h18M7 14l4-4 3 3 5-6"/>,
    sparkles: <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    palette: <><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.937.748-1.687 1.687-1.687h1.997c3.103 0 5.643-2.54 5.643-5.643C22 6.268 17.523 2 12 2z"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name]}
    </svg>
  );
}

function Sidebar({ active, onNav }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'orders',    label: 'Pedidos',    icon: 'cart',    count: 4 },
    { id: 'products',  label: 'Produtos',   icon: 'package' },
    { id: 'customers', label: 'Clientes',   icon: 'users' },
    { id: 'analytics', label: 'Análises',   icon: 'chart' },
  ];
  const ai = [
    { id: 'ai-analyst', label: 'IA Analyst',     icon: 'sparkles' },
    { id: 'ugc',        label: 'Moderação UGC',  icon: 'inbox', count: 12 },
  ];
  const settings = [
    { id: 'theme',    label: 'Aparência',     icon: 'palette' },
    { id: 'settings', label: 'Configurações', icon: 'settings' },
  ];

  const Item = ({ it }) => (
    <a className={active === it.id ? 'active' : ''} onClick={() => onNav?.(it.id)}>
      <Icon name={it.icon}/>
      <span>{it.label}</span>
      {it.count != null && <span className="count">{it.count}</span>}
    </a>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 56 56"><path d="M8 8 H44 V44 H20 a12 12 0 0 1 -12 -12 Z" fill="#00553D"/><circle cx="34" cy="20" r="4" fill="#FAFAF7"/></svg>
        <span className="word">lojeo</span>
      </div>

      <div className="nav">
        {items.map(it => <Item key={it.id} it={it}/>)}
      </div>

      <div className="nav-section">
        <div className="label">IA & Conteúdo</div>
        <div className="nav">
          {ai.map(it => <Item key={it.id} it={it}/>)}
        </div>
      </div>

      <div className="nav-section">
        <div className="label">Loja</div>
        <div className="nav">
          {settings.map(it => <Item key={it.id} it={it}/>)}
        </div>
      </div>

      <div className="user-card">
        <div className="avatar">MC</div>
        <div>
          <div className="name">Marina Castro</div>
          <div className="store">Atelier Verde · MEI</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span style={{margin:'0 8px',color:'var(--neutral-300)'}}>/</span>}
            {i === crumbs.length - 1 ? <strong>{c}</strong> : c}
          </span>
        ))}
      </div>
      <div className="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input placeholder="Pedido, cliente, SKU…"/>
      </div>
      <div className="actions">
        <button className="icon-btn" title="Notificações">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          <span className="pip"/>
        </button>
        <button className="btn primary"><span style={{fontWeight:600,fontSize:14}}>+</span>Novo</button>
      </div>
    </header>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.Icon = Icon;
