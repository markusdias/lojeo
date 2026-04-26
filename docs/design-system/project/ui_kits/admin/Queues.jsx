// Queues.jsx — Lojeo admin operational queues
const { useState: useStateQ } = React;

function Queues({ initialTab = 'reviews' }) {
  const [tab, setTab] = useStateQ(initialTab);

  const tabs = [
    { id: 'reviews',  label: 'Avaliações',  count: 12 },
    { id: 'returns',  label: 'Trocas e devoluções', count: 4 },
    { id: 'shipping', label: 'Pendentes de envio',  count: 18 },
  ];

  return (
    <main className="main">
      <div className="page-header">
        <div>
          <h1>Filas operacionais</h1>
          <p className="sub">Tudo que precisa do seu olho hoje · 34 itens.</p>
        </div>
      </div>

      <div className="queue-tabs">
        {tabs.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}<span className="pill">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'reviews'  && <ReviewQueue/>}
      {tab === 'returns'  && <ReturnsQueue/>}
      {tab === 'shipping' && <ShippingQueue/>}
    </main>
  );
}

function ReviewQueue() {
  const [selected, setSelected] = useStateQ([]);
  const reviews = [
    { id: 1, cust: 'Marina C.',  initials: 'MC', when: 'há 2 h',   stars: 5, body: 'Cheguei a chorar. A embalagem é uma obra de arte por si só, vinda com bilhete escrito à mão. Já é o terceiro presente que compro aqui — sempre vão acertar.', product: 'Anel Solitário Ouro 18k · ANL-OR18-001', photo: '#E5E5E5' },
    { id: 2, cust: 'Lucas A.',   initials: 'LA', when: 'há 5 h',   stars: 4, body: 'Produto lindo, atendimento foi 10. Só achei que demorou um dia a mais que o prometido na entrega — mas dentro do prazo do Correios.', product: 'Pulseira Veneziana Prata · PUL-PRT-022', photo: '#D4D4D4' },
    { id: 3, cust: 'Beatriz L.', initials: 'BL', when: 'há 8 h',   stars: 2, body: 'O fecho da pulseira veio quebrado. Já abri ticket pra troca e a Camila do atendimento foi super atenciosa.', product: 'Pulseira Veneziana Prata · PUL-PRT-022', photo: '#E5E5E5' },
    { id: 4, cust: 'Camila R.',  initials: 'CR', when: 'há 1 dia', stars: 5, body: 'Comprei pra mim mesma e foi a melhor decisão. Uso todo dia, ainda nem precisou de polimento.', product: 'Brinco Argola Pequena · BRC-OR18-031', photo: '#D4D4D4' },
  ];

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <>
      {selected.length > 0 && (
        <div className="bulk-bar">
          <span className="label">{selected.length} avaliação(ões) selecionada(s)</span>
          <button>Aprovar todas</button>
          <button className="danger">Rejeitar todas</button>
          <button onClick={() => setSelected([])}>Cancelar</button>
        </div>
      )}

      {reviews.map(r => (
        <div key={r.id} className="review-card" style={{ outline: selected.includes(r.id) ? '2px solid var(--accent)' : 'none' }}>
          <div className="photo" style={{ background: r.photo, position: 'relative' }}>
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)}
              style={{ position: 'absolute', top: 6, left: 6 }}/>
          </div>
          <div>
            <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="avatar-sm" style={{ width: 22, height: 22, fontSize: 10 }}>{r.initials}</div>
              <strong style={{ color: 'var(--fg)' }}>{r.cust}</strong>
              <span>· {r.when}</span>
              <span className="stars" style={{ marginLeft: 8 }}>
                {'★'.repeat(r.stars)}<span style={{ color: 'var(--neutral-100)' }}>{'★'.repeat(5 - r.stars)}</span>
              </span>
            </div>
            <p className="body">{r.body}</p>
            <div className="product-line">↪ {r.product}</div>
          </div>
          <div className="actions">
            <button className="icon-act approve" title="Aprovar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m20 6-11 11-5-5"/></svg>
            </button>
            <button className="icon-act reject" title="Rejeitar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <button className="icon-act" title="Responder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m9 17-5-5 5-5M4 12h12a4 4 0 0 1 4 4v3"/></svg>
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

function ReturnsQueue() {
  const STEPS = [
    'Solicitada', 'Em análise', 'Aprovada', 'Aguardando produto', 'Recebida', 'Finalizada',
  ];
  const returns = [
    { id: 'TRC-00031', order: 'PED-00171', cust: 'Beatriz Lima',   reason: 'Defeito · fecho quebrado',     total: 'R$ 290,00', step: 1, opened: 'há 2 dias' },
    { id: 'TRC-00030', order: 'PED-00164', cust: 'Ricardo Souza',  reason: 'Tamanho incorreto · troca',    total: 'R$ 690,00', step: 2, opened: 'há 4 dias' },
    { id: 'TRC-00029', order: 'PED-00158', cust: 'Camila Rocha',   reason: 'Arrependimento · 7 dias CDC',  total: 'R$ 380,00', step: 3, opened: 'há 6 dias' },
    { id: 'TRC-00028', order: 'PED-00149', cust: 'Lucas Andrade',  reason: 'Produto não recebido',         total: 'R$ 1.890,00', step: 4, opened: 'há 9 dias' },
  ];
  return (
    <>
      {returns.map(r => (
        <div key={r.id} className="return-card">
          <div className="head">
            <span className="id">#{r.id}</span>
            <span className="cust">{r.cust} · {r.reason}</span>
            <span style={{ fontSize: 11, color: 'var(--fg-secondary)', fontFamily: 'var(--font-mono)' }}>aberta {r.opened}</span>
            <span className="total">{r.total}</span>
          </div>
          <div className="timeline">
            {STEPS.map((s, i) => (
              <div key={s} className={`step ${i < r.step ? 'done' : ''} ${i === r.step ? 'current' : ''}`}>
                <div className="node">{i < r.step ? '✓' : i + 1}</div>
                <span className="lbl">{s}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ShippingQueue() {
  const [selected, setSelected] = useStateQ([]);
  const orders = [
    { id: 'PED-00184', cust: 'Marina Castro',  city: 'São Paulo · SP',     items: 1, total: 'R$ 2.490,00', method: 'Sedex',   sla: 'até hoje' },
    { id: 'PED-00183', cust: 'Lucas Andrade',  city: 'Rio de Janeiro · RJ',items: 2, total: 'R$ 480,00',   method: 'PAC',     sla: 'até amanhã' },
    { id: 'PED-00182', cust: 'Beatriz Lima',   city: 'Curitiba · PR',      items: 1, total: 'R$ 1.180,90', method: 'Sedex',   sla: 'atrasada · 1 dia', late: true },
    { id: 'PED-00181', cust: 'Ricardo Souza',  city: 'Porto Alegre · RS',  items: 3, total: 'R$ 320,00',   method: 'Jadlog',  sla: 'até 2 maio' },
    { id: 'PED-00180', cust: 'Camila Rocha',   city: 'Recife · PE',        items: 1, total: 'R$ 690,00',   method: 'Sedex',   sla: 'até 30 abr' },
    { id: 'PED-00179', cust: 'João Mendes',    city: 'Belo Horizonte · MG',items: 2, total: 'R$ 1.420,00', method: 'PAC',     sla: 'até 3 maio' },
  ];
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const allSelected = selected.length === orders.length;

  return (
    <>
      {selected.length > 0 ? (
        <div className="bulk-bar">
          <span className="label">{selected.length} pedido(s) selecionado(s)</span>
          <button>Gerar etiquetas</button>
          <button>Imprimir picking list</button>
          <button onClick={() => setSelected([])}>Cancelar</button>
        </div>
      ) : (
        <div className="team-bar">
          <span style={{ fontSize: 12, color: 'var(--fg-secondary)', fontWeight: 500 }}>Filtrar:</span>
          <button className="filter-chip active">Todos · 18</button>
          <button className="filter-chip">Atrasados · 1</button>
          <button className="filter-chip">Prioritários · 4</button>
          <button className="filter-chip">Internacionais · 0</button>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : orders.map(o => o.id))} style={{ marginLeft: 4 }}/></th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Destino</th>
              <th>Itens</th>
              <th>Método</th>
              <th>Prazo</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td><input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} style={{ marginLeft: 4 }}/></td>
                <td className="mono" style={{ fontWeight: 500 }}>#{o.id}</td>
                <td>{o.cust}</td>
                <td style={{ color: 'var(--fg-secondary)' }}>{o.city}</td>
                <td className="mono">{o.items}</td>
                <td>{o.method}</td>
                <td>
                  <span className={`badge ${o.late ? 'b-error' : 'b-neutral'}`}>
                    <span className="dot"/>{o.sla}
                  </span>
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 500 }}>{o.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

window.Queues = Queues;
