// Wishlist.jsx — Wishlists, Gift cards, Back-in-stock
const { useState: useStateW } = React;

function Wishlist({ initialTab = 'wishlists' }) {
  const [tab, setTab] = useStateW(initialTab);

  return (
    <main className="main">
      <div className="page-header">
        <div>
          <h1>Wishlist e gift cards</h1>
          <p className="sub">Sinais de demanda que sua loja não está vendo no relatório de vendas.</p>
        </div>
      </div>

      <div className="queue-tabs">
        <button className={tab === 'wishlists' ? 'active' : ''} onClick={() => setTab('wishlists')}>
          Wishlists ativas<span className="pill">487</span>
        </button>
        <button className={tab === 'giftcards' ? 'active' : ''} onClick={() => setTab('giftcards')}>
          Gift cards<span className="pill">23</span>
        </button>
        <button className={tab === 'backstock' ? 'active' : ''} onClick={() => setTab('backstock')}>
          Back-in-stock<span className="pill">8</span>
        </button>
      </div>

      {tab === 'wishlists'  && <Wishlists/>}
      {tab === 'giftcards' && <GiftCards/>}
      {tab === 'backstock' && <BackInStock/>}
    </main>
  );
}

function Wishlists() {
  const items = [
    { sku: 'CLR-OR18-007', name: 'Colar Coração Ouro Rosé',  count: 84, stock: 0,  price: 'R$ 1.890,00' },
    { sku: 'ANL-OR18-001', name: 'Anel Solitário Ouro 18k',  count: 62, stock: 4,  price: 'R$ 2.490,00' },
    { sku: 'BRC-PRT-014',  name: 'Brinco Pérola Prata 950',  count: 47, stock: 12, price: 'R$ 380,00' },
    { sku: 'PUL-OR18-019', name: 'Pulseira Riviera Ouro',    count: 31, stock: 0,  price: 'R$ 4.200,00' },
    { sku: 'ANL-OR18-009', name: 'Aliança Lisa 4mm Par',     count: 28, stock: 6,  price: 'R$ 3.480,00' },
    { sku: 'BRC-OR18-031', name: 'Brinco Argola Pequena',    count: 22, stock: 22, price: 'R$ 690,00' },
  ];
  return (
    <>
      <div className="card" style={{ background: 'var(--ai-gradient-soft)', border: '1px solid var(--accent)', marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="badge b-ai">✨ IA</span>
          <div style={{ flex: 1, fontSize: 13, lineHeight: 1.55 }}>
            <strong>Colar Coração Ouro Rosé</strong> tem 84 pessoas esperando — você só fez 12 esse mês. Repor 80 unidades pode gerar ~R$ 151k de receita potencial.
          </div>
          <button className="btn primary sm">Pergunte ao IA →</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th style={{ textAlign: 'right' }}>Em wishlist</th>
              <th style={{ textAlign: 'right' }}>Estoque</th>
              <th style={{ textAlign: 'right' }}>Preço</th>
              <th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.sku}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--neutral-100)' }}/>
                    <div>
                      <div style={{ fontWeight: 500 }}>{it.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{it.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="mono" style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{it.count}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-secondary)', marginLeft: 4 }}>pessoas</span>
                </td>
                <td className="mono" style={{ textAlign: 'right' }}>
                  {it.stock === 0
                    ? <span className="badge b-error"><span className="dot"/>Zerado</span>
                    : <span style={{ color: it.stock <= 6 ? '#B45309' : 'var(--fg)' }}>{it.stock}</span>}
                </td>
                <td className="mono" style={{ textAlign: 'right' }}>{it.price}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn secondary sm">Ver lista →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function GiftCards() {
  const cards = [
    { code: 'GFT-X4M2-9K7P', value: 'R$ 500,00', balance: 'R$ 280,00', buyer: 'Marina Castro',  to: 'Amanda Reis',     when: '14 abr 2026', status: 'Parcial',   sc: 'b-warn' },
    { code: 'GFT-Y8B1-3T6N', value: 'R$ 200,00', balance: 'R$ 200,00', buyer: 'Lucas Andrade',  to: 'Fernanda Lima',   when: '12 abr 2026', status: 'Ativo',     sc: 'b-success' },
    { code: 'GFT-P2Q5-7L9V', value: 'R$ 1.000,00',balance: 'R$ 0,00',  buyer: 'Ricardo Souza',  to: 'Júlia Costa',     when: '8 abr 2026',  status: 'Resgatado', sc: 'b-neutral' },
    { code: 'GFT-K3R8-1H4M', value: 'R$ 300,00', balance: 'R$ 300,00', buyer: 'Camila Rocha',   to: 'Beatriz Mendes',  when: '5 abr 2026',  status: 'Ativo',     sc: 'b-success' },
    { code: 'GFT-N6Z2-8F4D', value: 'R$ 150,00', balance: 'R$ 0,00',   buyer: 'João Mendes',    to: 'Patrícia Souza',  when: '2 mar 2026',  status: 'Expirado',  sc: 'b-error' },
  ];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Em circulação</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>R$ 8.420</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Resgatados (mês)</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>R$ 3.180</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Cards ativos</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>23</div>
        </div>
        <div className="card" style={{ padding: 16, background: 'var(--warning-soft)', borderColor: '#FCD34D' }}>
          <div style={{ fontSize: 11, color: '#92400E' }}>Expirando em 30d</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: '#92400E' }}>4</div>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Código</th><th>Valor</th><th>Saldo</th><th>Comprador</th><th>Destinatário</th><th>Emitido</th><th>Status</th></tr>
          </thead>
          <tbody>
            {cards.map(c => (
              <tr key={c.code}>
                <td className="mono" style={{ fontWeight: 500 }}>{c.code}</td>
                <td className="mono">{c.value}</td>
                <td className="mono" style={{ fontWeight: 500 }}>{c.balance}</td>
                <td>{c.buyer}</td>
                <td>{c.to}</td>
                <td style={{ color: 'var(--fg-secondary)' }}>{c.when}</td>
                <td><span className={`badge ${c.sc}`}><span className="dot"/>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BackInStock() {
  const items = [
    { sku: 'CLR-OR18-007', name: 'Colar Coração Ouro Rosé',  waiting: 84, lastSignup: 'há 12 min', incoming: 'compra solicitada · 5 dias' },
    { sku: 'PUL-OR18-019', name: 'Pulseira Riviera Ouro',    waiting: 31, lastSignup: 'há 2 h',    incoming: 'sem reposição agendada' },
    { sku: 'BRC-PRT-009',  name: 'Brinco Cristal Suspenso',  waiting: 18, lastSignup: 'há 4 h',    incoming: 'em produção · 14 dias' },
    { sku: 'ANL-PRT-022',  name: 'Anel Bandeira Prata 950',  waiting: 12, lastSignup: 'há 1 dia',  incoming: 'sem reposição agendada' },
    { sku: 'CLR-OR18-014', name: 'Gargantilha Elo Ouro',     waiting: 9,  lastSignup: 'há 2 dias', incoming: 'em produção · 7 dias' },
  ];
  return (
    <>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Produto</th><th style={{ textAlign: 'right' }}>Esperando</th><th>Último cadastro</th><th>Reposição</th><th style={{ width: 200, textAlign: 'right' }}></th></tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.sku}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--neutral-100)' }}/>
                    <div>
                      <div style={{ fontWeight: 500 }}>{it.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{it.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="mono" style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{it.waiting}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-secondary)', marginLeft: 4 }}>clientes</span>
                </td>
                <td style={{ color: 'var(--fg-secondary)' }}>{it.lastSignup}</td>
                <td style={{ color: 'var(--fg-secondary)', fontSize: 12 }}>{it.incoming}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn primary sm" style={{ marginRight: 6 }}>Notificar todos</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

window.Wishlist = Wishlist;
