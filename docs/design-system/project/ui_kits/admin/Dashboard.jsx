// Dashboard.jsx — Lojeo admin home
const { useState: useStateD } = React;

function MetricCard({ label, value, delta, deltaDir = 'up', spark }) {
  return (
    <div className="metric">
      <div className="metric-head">
        <span className="metric-label">{label}</span>
        <span className={`delta ${deltaDir}`}>{deltaDir === 'up' ? '▲' : '▼'} {delta}</span>
      </div>
      <div className="metric-value mono">{value}</div>
      <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline points={spark} fill="none" stroke={deltaDir === 'up' ? '#00553D' : '#737373'} strokeWidth="1.5"/>
      </svg>
    </div>
  );
}

function Dashboard() {
  const orders = [
    { id: 'PED-00184', cust: 'Marina Castro',  status: 'Pago',              statusClass: 'b-success', total: 'R$ 2.490,00', when: 'há 4 min' },
    { id: 'PED-00183', cust: 'Lucas Andrade',  status: 'Aguardando envio',  statusClass: 'b-warn',    total: 'R$ 480,00',   when: 'há 22 min' },
    { id: 'PED-00182', cust: 'Beatriz Lima',   status: 'Em trânsito',       statusClass: 'b-info',    total: 'R$ 1.180,90', when: 'há 1 h' },
    { id: 'PED-00181', cust: 'Ricardo Souza',  status: 'Pago',              statusClass: 'b-success', total: 'R$ 320,00',   when: 'há 2 h' },
    { id: 'PED-00180', cust: 'Camila Rocha',   status: 'Reembolsado',       statusClass: 'b-neutral', total: 'R$ 690,00',   when: 'há 3 h' },
  ];

  return (
    <main className="main">
      <div className="page-header">
        <div>
          <h1>Tudo certo, Marina 👋</h1>
          <p className="sub">Aqui está um resumo da sua loja hoje, 25 de abril.</p>
        </div>
        <div className="actions">
          <button className="btn secondary">Exportar</button>
          <button className="btn primary">+ Novo produto</button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Receita hoje"  value="R$ 4.280,90" delta="12,4%" deltaDir="up"   spark="0,22 12,18 24,20 36,14 48,16 60,8 72,12 84,6 100,9"/>
        <MetricCard label="Pedidos"       value="28"          delta="3"     deltaDir="up"   spark="0,18 14,16 28,20 42,12 56,14 70,10 84,8 100,11"/>
        <MetricCard label="Conversão"     value="2,8%"        delta="0,4%"  deltaDir="down" spark="0,10 14,12 28,9 42,14 56,16 70,18 84,20 100,22"/>
        <MetricCard label="Margem média"  value="42,3%"       delta="1,1%"  deltaDir="up"   spark="0,20 14,18 28,16 42,14 56,12 70,10 84,9 100,7"/>
      </div>

      <div className="dash-grid">
        <div className="card" style={{gridColumn: 'span 2'}}>
          <div className="card-header">
            <h3>Receita · últimos 7 dias</h3>
            <span className="meta">comparado com semana anterior</span>
          </div>
          <div className="card-body">
            <svg viewBox="0 0 600 180" preserveAspectRatio="none" style={{width:'100%',height:180}}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00553D" stopOpacity="0.16"/>
                  <stop offset="100%" stopColor="#00553D" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[40,80,120,160].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#F5F5F5" strokeWidth="1"/>)}
              <path d="M0,140 L85,120 L170,130 L255,90 L340,100 L425,60 L510,70 L600,40 L600,180 L0,180 Z" fill="url(#grad)"/>
              <polyline points="0,140 85,120 170,130 255,90 340,100 425,60 510,70 600,40" fill="none" stroke="#00553D" strokeWidth="2"/>
              <polyline points="0,160 85,150 170,150 255,130 340,135 425,115 510,120 600,100" fill="none" stroke="#A3A3A3" strokeWidth="1.5" strokeDasharray="3 4"/>
            </svg>
            <div className="legend">
              <span><i style={{background:'#00553D'}}/>Esta semana</span>
              <span><i style={{background:'#A3A3A3'}}/>Semana anterior</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Saúde das integrações</h3></div>
          <div className="card-body">
            <ul className="health">
              <li><span className="dot" style={{background:'#10B981'}}/>Mercado Pago<span className="badge b-success" style={{marginLeft:'auto'}}>OK</span></li>
              <li><span className="dot" style={{background:'#10B981'}}/>Melhor Envio<span className="badge b-success" style={{marginLeft:'auto'}}>OK</span></li>
              <li><span className="dot" style={{background:'#F59E0B'}}/>Bling NF-e<span className="badge b-warn" style={{marginLeft:'auto'}}>Lento</span></li>
              <li><span className="dot" style={{background:'#10B981'}}/>Resend e-mail<span className="badge b-success" style={{marginLeft:'auto'}}>OK</span></li>
              <li><span className="dot" style={{background:'#EF4444'}}/>Pixel Meta<span className="badge b-error" style={{marginLeft:'auto'}}>Reconectar</span></li>
            </ul>
          </div>
        </div>

        <div className="card" style={{gridColumn: 'span 2'}}>
          <div className="card-header">
            <h3>Últimos pedidos</h3>
            <span className="meta">Ver todos →</span>
          </div>
          <table className="table">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Quando</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="mono" style={{fontWeight:500}}>#{o.id}</td>
                  <td>{o.cust}</td>
                  <td><span className={`badge ${o.statusClass}`}><span className="dot"/>{o.status}</span></td>
                  <td style={{color:'var(--fg-secondary)'}}>{o.when}</td>
                  <td className="mono" style={{textAlign:'right',fontWeight:500}}>{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card ai-card">
          <div className="card-header">
            <h3><span className="badge b-ai" style={{marginRight:8}}>✨ IA</span>Insights de hoje</h3>
          </div>
          <div className="card-body">
            <p className="insight"><strong>3 produtos</strong> vão zerar estoque em ~5 dias no ritmo atual.</p>
            <p className="insight"><strong>Conversão caiu 0,4%</strong> — checkout mobile teve 12 abandonos com erro de Pix.</p>
            <p className="insight"><strong>Cliente VIP</strong> Ricardo S. está há 67 dias sem comprar (RFM em risco).</p>
            <button className="btn secondary sm" style={{marginTop:8}}>Pergunte ao IA Analyst →</button>
          </div>
        </div>
      </div>
    </main>
  );
}

window.Dashboard = Dashboard;
