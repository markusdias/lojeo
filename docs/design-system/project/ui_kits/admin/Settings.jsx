// Settings.jsx — Lojeo admin settings (8 tabs)
const { useState: useStateS } = React;

function SettingsIcon({ name }) {
  const paths = {
    store:    <><path d="M3 9l1-5h16l1 5"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M9 21v-6h6v6"/></>,
    card:     <><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 11h20"/></>,
    truck:    <><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 5v3h-7"/><circle cx="6" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></>,
    mail:     <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/></>,
    receipt:  <><path d="M5 2v20l3-2 3 2 3-2 3 2 3-2V2"/><path d="M8 7h8M8 11h8M8 15h5"/></>,
    target:   <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    spark:    <path d="m12 3 1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>,
    users:    <><circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M14 20a4 4 0 0 1 7 0"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
  );
}

function Toggle({ on, onChange }) {
  return <div className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange?.(!on)} role="switch" aria-checked={on}/>;
}

function StatusPill({ kind, children }) {
  const styles = {
    ok:    { bg: 'var(--success-soft)', fg: '#047857' },
    warn:  { bg: 'var(--warning-soft)', fg: '#B45309' },
    error: { bg: 'var(--error-soft)',   fg: '#B91C1C' },
  }[kind];
  return <span className="status-pill" style={{ background: styles.bg, color: styles.fg }}><span className="dot"/>{children}</span>;
}

function Integration({ logo, color, name, desc, status, account, statusKind = 'ok' }) {
  const connected = status !== 'disconnected';
  return (
    <div className="integration">
      <div className="logo" style={{ background: color }}>{logo}</div>
      <div className="body">
        <div className="name">{name}</div>
        <div className="desc">{desc}</div>
        {connected ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
            <StatusPill kind={statusKind}>{status}</StatusPill>
            <span style={{ fontSize:11, color:'var(--fg-secondary)', fontFamily:'var(--font-mono)' }}>{account}</span>
          </div>
        ) : null}
      </div>
      <div className="actions">
        {connected ? (
          <>
            <button className="btn ghost sm">Ressincronizar</button>
            <button className="btn secondary sm">Gerenciar</button>
          </>
        ) : (
          <button className="btn primary sm">Conectar</button>
        )}
      </div>
    </div>
  );
}

function SettingsIdentidade() {
  const [accent, setAccent] = useStateS('verde');
  const swatches = [
    { id: 'verde',   color: '#00553D' },
    { id: 'azul',    color: '#1D4ED8' },
    { id: 'vinho',   color: '#9F1239' },
    { id: 'roxo',    color: '#6D28D9' },
    { id: 'preto',   color: '#0A0A0A' },
  ];
  return (
    <section className="settings-section">
      <h2>Identidade da loja</h2>
      <p className="lead">Como sua loja aparece pra clientes — nome, logo, slogan e cor de destaque.</p>
      <div className="card"><div style={{ padding: '0 24px' }}>
        <div className="field">
          <div className="lbl">Nome da loja<span className="hint">Aparece no checkout e e-mails</span></div>
          <div className="control"><input type="text" defaultValue="Atelier Verde"/></div>
        </div>
        <div className="field">
          <div className="lbl">Logo<span className="hint">PNG ou SVG · até 2MB · 512×512px ideal</span></div>
          <div className="control" style={{ display:'flex', alignItems:'center', gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--neutral-50)', border: '1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="32" height="32" viewBox="0 0 56 56"><path d="M8 8 H44 V44 H20 a12 12 0 0 1 -12 -12 Z" fill="#00553D"/><circle cx="34" cy="20" r="4" fill="#FAFAF7"/></svg>
            </div>
            <button className="btn secondary sm">Substituir</button>
            <button className="btn ghost sm">Remover</button>
          </div>
        </div>
        <div className="field">
          <div className="lbl">Slogan<span className="hint">1 linha · usado em meta tags</span></div>
          <div className="control"><input type="text" defaultValue="Joias autorais feitas à mão em São Paulo"/></div>
        </div>
        <div className="field">
          <div className="lbl">Cor de destaque<span className="hint">Botões, links e estados ativos</span></div>
          <div className="control swatch-row">
            {swatches.map(s => (
              <button key={s.id} className={accent === s.id ? 'selected' : ''} style={{ background: s.color }} onClick={() => setAccent(s.id)} title={s.id}/>
            ))}
            <button className="btn ghost sm" style={{ marginLeft: 8 }}>+ Personalizar</button>
          </div>
        </div>
      </div></div>
    </section>
  );
}

function SettingsGateways() {
  return (
    <section className="settings-section">
      <h2>Gateways de pagamento</h2>
      <p className="lead">Conecte uma ou mais formas de receber. OAuth de 1 clique — sem copiar chaves.</p>
      <div className="integration-grid">
        <Integration logo="MP" color="#00B1EA" name="Mercado Pago" desc="Pix, boleto, cartão · taxa 4,99%"
          status="Conectado · sincronizado há 2 min" statusKind="ok" account="atelierverde@email.com"/>
        <Integration logo="P." color="#0E1116" name="Pagar.me" desc="Adquirente full · taxa 2,99%"
          status="Conectado" statusKind="ok" account="store_id_8412"/>
        <Integration logo="St" color="#635BFF" name="Stripe" desc="Internacional · cartão e Apple Pay"
          status="Atenção · webhook desatualizado" statusKind="warn" account="acct_1Q...8412"/>
        <Integration logo="PP" color="#003087" name="PayPal" desc="Internacional · 100+ moedas" status="disconnected"/>
      </div>
    </section>
  );
}

function SettingsFrete() {
  return (
    <section className="settings-section">
      <h2>Frete e logística</h2>
      <p className="lead">Cotação automática e geração de etiquetas — Brasil e exterior.</p>
      <div className="integration-grid">
        <Integration logo="ME" color="#0FAA00" name="Melhor Envio" desc="Correios, Jadlog, Latam Cargo"
          status="Conectado · saldo R$ 248,00" statusKind="ok" account="atelierverde"/>
        <Integration logo="C" color="#FFE600" name="Correios direto" desc="Contrato próprio · cartão postagem" status="disconnected"/>
        <Integration logo="DHL" color="#D40511" name="DHL Express" desc="Internacional door-to-door"
          status="Conectado" statusKind="ok" account="9847..."/>
        <Integration logo="FX" color="#4D148C" name="FedEx" desc="Internacional · 220+ países" status="disconnected"/>
      </div>
    </section>
  );
}

function SettingsEmail() {
  return (
    <section className="settings-section">
      <h2>E-mail transacional</h2>
      <p className="lead">Confirmações de pedido, rastreio, recuperação de carrinho.</p>
      <div className="integration-grid">
        <Integration logo="R" color="#000000" name="Resend" desc="API simples · domínio verificado"
          status="Conectado · DKIM/SPF OK" statusKind="ok" account="hello@atelierverde.com"/>
        <Integration logo="SG" color="#1A82E2" name="SendGrid" desc="Volume alto · entregabilidade" status="disconnected"/>
      </div>
    </section>
  );
}

function SettingsFiscal() {
  return (
    <section className="settings-section">
      <h2>Fiscal e ERP</h2>
      <p className="lead">Emissão automática de NF-e por pedido + sync de estoque.</p>
      <div className="integration-grid">
        <Integration logo="Bl" color="#0EA5E9" name="Bling" desc="ERP + NF-e · sync 5min"
          status="Conectado" statusKind="ok" account="cnpj 11.111.111/0001-11"/>
        <Integration logo="Ol" color="#7C3AED" name="Olist Tiny" desc="ERP · NF-e · estoque" status="disconnected"/>
      </div>
    </section>
  );
}

function SettingsPixels() {
  return (
    <section className="settings-section">
      <h2>Pixels e analytics</h2>
      <p className="lead">Eventos via server-side com fallback no navegador. OAuth de 1 clique.</p>
      <div className="integration-grid">
        <Integration logo="GA" color="#F9AB00" name="Google Analytics 4" desc="Eventos GA4 + GTM"
          status="Conectado" statusKind="ok" account="G-XK4N2..."/>
        <Integration logo="GTM" color="#246FDB" name="Google Tag Manager" desc="Container compartilhado"
          status="Conectado" statusKind="ok" account="GTM-K8..."/>
        <Integration logo="Me" color="#0866FF" name="Meta Pixel" desc="Facebook + Instagram Ads"
          status="Reconectar · token expirou" statusKind="error" account="—"/>
        <Integration logo="Tk" color="#000000" name="TikTok Pixel" desc="TikTok for Business"
          status="Conectado" statusKind="ok" account="C8UQ..."/>
        <Integration logo="GAds" color="#4285F4" name="Google Ads" desc="Conversões + remarketing"
          status="Conectado" statusKind="ok" account="987-654-3210"/>
        <Integration logo="Cy" color="#E53A4D" name="Microsoft Clarity" desc="Heatmaps + session replay" status="disconnected"/>
      </div>
    </section>
  );
}

function SettingsIA() {
  const [econMode, setEconMode] = useStateS(false);
  const [alertOn, setAlertOn] = useStateS(true);
  return (
    <section className="settings-section">
      <h2>IA · cota e custos</h2>
      <p className="lead">Você controla quanto sua loja gasta com IA. Hoje no plano Pro você tem R$ 80,00/mês inclusos.</p>

      <div className="card" style={{ marginBottom: 14 }}><div className="card-body">
        <div style={{ display:'flex', alignItems:'baseline', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Uso este mês</span>
          <span className="mono" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>R$ 38,40</span>
          <span style={{ color:'var(--fg-secondary)', fontSize: 13 }}>de R$ 80,00 <span style={{ color: 'var(--fg-muted)' }}>· US$ 7.68</span></span>
          <span className="badge b-success" style={{ marginLeft: 'auto' }}><span className="dot"/>48% usado</span>
        </div>
        <div className="cota-bar"><div className="fill" style={{ width: '48%' }}/></div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color:'var(--fg-secondary)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
          <span>Renovação em 5 dias · 30 abr</span>
          <span>Projeção: R$ 64,00 · dentro do limite</span>
        </div>
      </div></div>

      <div className="card"><div style={{ padding: '0 24px' }}>
        <div className="field">
          <div className="lbl">Modo econômico<span className="hint">Roteia tarefas simples pro modelo mais barato</span></div>
          <div className="control" style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <Toggle on={econMode} onChange={setEconMode}/>
            <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{econMode ? 'Ativo · economiza ~60%' : 'Desativado'}</span>
          </div>
        </div>
        <div className="field">
          <div className="lbl">Modelo padrão<span className="hint">O modo econômico só afeta tarefas leves</span></div>
          <div className="control" style={{ display:'grid', gap: 8, maxWidth: 520 }}>
            <div className={`mode-card ${!econMode ? 'recommended' : ''}`}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background:'var(--ai-gradient)', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/></svg>
              </div>
              <div>
                <div className="name">Sonnet · qualidade alta</div>
                <div className="meta">Análises profundas, copy criativa, recomendações personalizadas</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price">R$ 0,015 / análise</div>
                <div style={{ fontSize: 10, color: 'var(--fg-secondary)', marginTop: 2 }}>~5x mais caro</div>
              </div>
            </div>
            <div className={`mode-card ${econMode ? 'recommended' : ''}`}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background:'var(--neutral-100)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--neutral-600)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/></svg>
              </div>
              <div>
                <div className="name">Haiku · econômico</div>
                <div className="meta">Classificação, resumos, tags · perde nuance em copy criativa</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price">R$ 0,003 / análise</div>
                <div style={{ fontSize: 10, color: 'var(--success)', marginTop: 2, fontWeight: 600 }}>economiza 80%</div>
              </div>
            </div>
          </div>
        </div>
        <div className="field">
          <div className="lbl">Alerta de limite<span className="hint">Avisa por e-mail quando atingir 90%</span></div>
          <div className="control" style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <Toggle on={alertOn} onChange={setAlertOn}/>
            <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>marina@atelierverde.com</span>
          </div>
        </div>
      </div></div>
    </section>
  );
}

const SETTINGS_TABS = [
  { id: 'identidade', label: 'Identidade da loja', icon: 'store',   group: 'Loja' },
  { id: 'pagamentos', label: 'Gateways',           icon: 'card',    group: 'Vendas' },
  { id: 'frete',      label: 'Frete',              icon: 'truck',   group: 'Vendas' },
  { id: 'fiscal',     label: 'Fiscal e ERP',       icon: 'receipt', group: 'Vendas' },
  { id: 'email',      label: 'E-mail',             icon: 'mail',    group: 'Comunicação' },
  { id: 'pixels',     label: 'Pixels & Analytics', icon: 'target',  group: 'Comunicação' },
  { id: 'ia',         label: 'IA · cota',          icon: 'spark',   group: 'Inteligência' },
  { id: 'equipe',     label: 'Equipe',             icon: 'users',   group: 'Conta' },
];

function Settings({ initialTab = 'pagamentos', onNavTeam }) {
  const [tab, setTab] = useStateS(initialTab);

  const grouped = {};
  SETTINGS_TABS.forEach(t => { (grouped[t.group] = grouped[t.group] || []).push(t); });

  return (
    <main className="main">
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p className="sub">Tudo que sua loja precisa pra funcionar — em um lugar.</p>
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-tabs">
          {Object.entries(grouped).map(([g, items]) => (
            <React.Fragment key={g}>
              <div className="group-label">{g}</div>
              {items.map(t => (
                <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => {
                  if (t.id === 'equipe' && onNavTeam) { onNavTeam(); return; }
                  setTab(t.id);
                }}>
                  <SettingsIcon name={t.icon}/>
                  {t.label}
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <div>
          {tab === 'identidade' && <SettingsIdentidade/>}
          {tab === 'pagamentos' && <SettingsGateways/>}
          {tab === 'frete'      && <SettingsFrete/>}
          {tab === 'fiscal'     && <SettingsFiscal/>}
          {tab === 'email'      && <SettingsEmail/>}
          {tab === 'pixels'     && <SettingsPixels/>}
          {tab === 'ia'         && <SettingsIA/>}
        </div>
      </div>
    </main>
  );
}

window.Settings = Settings;
window.SettingsToggle = Toggle;
window.SettingsIcon = SettingsIcon;
