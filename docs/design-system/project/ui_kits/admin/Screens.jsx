// Products.jsx, Orders.jsx, Login.jsx — Lojeo admin screens
const { useState: useStateP } = React;

function Products() {
  const products = [
    { sku: 'ANL-OR18-001', name: 'Anel Solitário Ouro 18k', img: '#E5E5E5', stock: 4,  price: 'R$ 2.490,00', status: 'Ativo',     statusClass: 'b-success', sales: 28 },
    { sku: 'BRC-PRT-014', name: 'Brinco Pérola Prata 950',  img: '#D4D4D4', stock: 12, price: 'R$ 380,00',   status: 'Ativo',     statusClass: 'b-success', sales: 41 },
    { sku: 'CLR-OR18-007', name: 'Colar Coração Ouro Rosé', img: '#E5E5E5', stock: 0,  price: 'R$ 1.890,00', status: 'Sem estoque', statusClass: 'b-error', sales: 19 },
    { sku: 'PUL-PRT-022', name: 'Pulseira Veneziana Prata', img: '#D4D4D4', stock: 8,  price: 'R$ 290,00',   status: 'Ativo',     statusClass: 'b-success', sales: 33 },
    { sku: 'ANL-OR18-009', name: 'Aliança Lisa 4mm Par',    img: '#E5E5E5', stock: 6,  price: 'R$ 3.480,00', status: 'Rascunho',  statusClass: 'b-neutral', sales: 0  },
    { sku: 'BRC-OR18-031', name: 'Brinco Argola Pequena',   img: '#D4D4D4', stock: 22, price: 'R$ 690,00',   status: 'Ativo',     statusClass: 'b-success', sales: 12 },
  ];
  return (
    <main className="main">
      <div className="page-header">
        <div>
          <h1>Produtos</h1>
          <p className="sub">{products.length} produtos · 1 com estoque zerado</p>
        </div>
        <div className="actions">
          <button className="btn secondary">Importar CSV</button>
          <button className="btn primary">+ Novo produto</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-inline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input placeholder="Buscar por nome ou SKU"/>
        </div>
        <button className="chip active">Todos <span className="chip-count">142</span></button>
        <button className="chip">Ativos</button>
        <button className="chip">Rascunhos</button>
        <button className="chip">Sem estoque <span className="chip-count">1</span></button>
        <button className="btn ghost sm" style={{marginLeft:'auto'}}>Filtros avançados</button>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table className="table">
          <thead>
            <tr>
              <th style={{width:32}}><input type="checkbox"/></th>
              <th>Produto</th>
              <th>SKU</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Vendas (30d)</th>
              <th style={{textAlign:'right'}}>Preço</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.sku}>
                <td><input type="checkbox"/></td>
                <td>
                  <div className="prod-cell">
                    <div className="prod-img" style={{background:p.img}}/>
                    <div>
                      <div style={{fontWeight:500,color:'var(--fg)'}}>{p.name}</div>
                      <div style={{fontSize:11,color:'var(--fg-secondary)'}}>3 variantes · 5 fotos</div>
                    </div>
                  </div>
                </td>
                <td className="mono" style={{fontSize:12,color:'var(--fg-secondary)'}}>{p.sku}</td>
                <td className="mono" style={{color: p.stock === 0 ? '#B91C1C' : 'var(--fg)'}}>{p.stock}</td>
                <td><span className={`badge ${p.statusClass}`}><span className="dot"/>{p.status}</span></td>
                <td className="mono" style={{color:'var(--fg-secondary)'}}>{p.sales}</td>
                <td className="mono" style={{textAlign:'right',fontWeight:500}}>{p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Orders() {
  const steps = [
    { label: 'Pago',        time: '25 abr · 14:32', done: true },
    { label: 'Em separação',time: '25 abr · 15:10', done: true },
    { label: 'Enviado',     time: '25 abr · 17:45', done: true },
    { label: 'Em trânsito', time: 'agora',          done: true, current: true },
    { label: 'Entregue',    time: 'previsto 28 abr', done: false },
  ];
  return (
    <main className="main">
      <div className="page-header">
        <div>
          <p className="sub" style={{margin:'0 0 4px'}}>Pedido</p>
          <h1 className="mono" style={{letterSpacing:'-0.02em'}}>#PED-00184</h1>
        </div>
        <div className="actions">
          <button className="btn secondary">Imprimir etiqueta</button>
          <button className="btn secondary">Reembolsar</button>
          <button className="btn primary">Marcar como entregue</button>
        </div>
      </div>

      <div className="order-grid">
        <div className="card">
          <div className="card-header"><h3>Linha do tempo</h3><span className="meta">timezone: BRT</span></div>
          <div className="card-body">
            <ol className="timeline">
              {steps.map((s,i) => (
                <li key={i} className={s.done ? (s.current ? 'current' : 'done') : ''}>
                  <span className="tl-dot"/>
                  <div>
                    <div style={{fontWeight:500,color:s.done?'var(--fg)':'var(--fg-muted)'}}>{s.label}</div>
                    <div style={{fontSize:12,color:'var(--fg-secondary)'}}>{s.time}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Itens</h3></div>
          <div className="card-body" style={{padding:0}}>
            <div className="line-item">
              <div className="prod-img" style={{background:'#E5E5E5'}}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:500}}>Anel Solitário Ouro 18k</div>
                <div style={{fontSize:12,color:'var(--fg-secondary)'}}>Tamanho 16 · 1 un</div>
              </div>
              <div className="mono" style={{fontWeight:500}}>R$ 2.490,00</div>
            </div>
            <div className="totals">
              <div><span>Subtotal</span><span className="mono">R$ 2.490,00</span></div>
              <div><span>Frete (Sedex)</span><span className="mono">R$ 28,90</span></div>
              <div><span>Desconto cupom <code>BEMVINDA10</code></span><span className="mono" style={{color:'#B91C1C'}}>− R$ 249,00</span></div>
              <div className="grand"><span>Total</span><span className="mono">R$ 2.269,90</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Cliente</h3></div>
          <div className="card-body">
            <div className="cust-row">
              <div className="avatar" style={{background:'linear-gradient(135deg,#00553D,#34C796)',color:'#fff'}}>MC</div>
              <div>
                <div style={{fontWeight:500}}>Marina Castro</div>
                <div style={{fontSize:12,color:'var(--fg-secondary)'}}>marina@email.com · 3º pedido</div>
              </div>
              <span className="badge b-accent" style={{marginLeft:'auto'}}>VIP</span>
            </div>
            <div className="kv">
              <div><span>LTV</span><span className="mono">R$ 6.180,00</span></div>
              <div><span>Ticket médio</span><span className="mono">R$ 2.060,00</span></div>
              <div><span>RFM</span><span>Recência alta</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Pagamento & frete</h3></div>
          <div className="card-body">
            <div className="kv">
              <div><span>Gateway</span><span><span className="badge b-success" style={{fontSize:10}}><span className="dot"/>Mercado Pago</span></span></div>
              <div><span>Método</span><span>Pix</span></div>
              <div><span>NF-e</span><span className="mono" style={{color:'var(--accent)'}}>NFe-2026-00184</span></div>
              <div><span>Transportadora</span><span>Correios Sedex</span></div>
              <div><span>Rastreio</span><span className="mono">BR4823740123</span></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Login() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <svg width="44" height="44" viewBox="0 0 56 56" style={{marginBottom:24}}>
          <path d="M8 8 H44 V44 H20 a12 12 0 0 1 -12 -12 Z" fill="#00553D"/>
          <circle cx="34" cy="20" r="4" fill="#FAFAF7"/>
        </svg>
        <h1 style={{fontSize:24,fontWeight:600,letterSpacing:'-0.025em',margin:'0 0 6px'}}>Entre no seu lojeo</h1>
        <p style={{color:'var(--fg-secondary)',margin:'0 0 28px',fontSize:14}}>Sua loja te espera.</p>

        <button className="btn-oauth google">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.5 0-14 4.4-17.7 10.2z"/><path fill="#4CAF50" d="M24 43.5c4.9 0 9.4-1.9 12.8-4.9l-5.9-5c-2 1.3-4.4 2.1-6.9 2.1-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.7l5.9 5c-.4.4 6.3-4.6 6.3-14.7 0-1.2-.1-2.3-.4-3.5z"/></svg>
          Continuar com Google
        </button>
        <button className="btn-oauth apple">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.5c0-2.3 1.9-3.4 2-3.4-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.9-3-.9c-1.5 0-2.9.9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.1.7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.9-1.3 1.2-2.5 1.3-2.6-.1-.1-2.4-.9-2.4-3.7zM14.7 5.7c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2z"/></svg>
          Continuar com Apple
        </button>

        <div className="login-divider"><span>ou com e-mail</span></div>

        <div className="form">
          <label>E-mail</label>
          <input type="email" placeholder="você@suamarca.com.br"/>
          <label>Senha</label>
          <input type="password" placeholder="••••••••"/>
          <button className="btn primary" style={{width:'100%',height:42,marginTop:12}}>Entrar</button>
        </div>

        <p style={{fontSize:12,color:'var(--fg-secondary)',marginTop:24,textAlign:'center'}}>
          Ainda não tem loja? <a style={{color:'var(--accent)',fontWeight:500}}>Crie a sua em 2 minutos →</a>
        </p>
      </div>
    </div>
  );
}

window.Products = Products;
window.Orders = Orders;
window.Login = Login;
