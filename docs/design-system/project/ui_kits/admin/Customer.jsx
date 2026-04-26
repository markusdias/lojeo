// Customer.jsx — Lojeo admin customer profile (CRM) with RFM persona variants
// Toggle entre 4 perfis: Champion, At Risk, Lost, New — cada um muda o card de stats,
// as tags, e principalmente as sugestões da IA (microcopy é DIFERENTE por estágio).
const { useState: useStateC } = React;

// ─── 4 personas RFM ──────────────────────────────────────────────────────
const PERSONAS = {
  champion: {
    id: 'champion',
    name: 'Beatriz Lima',
    initials: 'BL',
    email: 'beatriz.lima@email.com',
    since: 'maio 2024',
    ordersCount: 12,
    rfm: { label: 'Champion', code: '5/5/4', color: 'champion' },
    pitch: 'Compra de 30 em 30 dias · prefere brincos · sempre confirma estoque por DM antes de comprar.',
    stats: { ltv: 'R$ 8.420', orders: '12', aov: 'R$ 702', recency: '28d' },
    phone: '+55 11 98472-1124',
    address: ['Rua das Palmeiras, 234 · apto 12', 'Pinheiros · São Paulo · SP', '05428-001 · BR'],
    tags: [
      { label: 'VIP', cls: 'b-accent' },
      { label: 'prefere brincos', cls: 'b-neutral' },
      { label: 'São Paulo', cls: 'b-neutral' },
      { label: 'aniversário 14 jul', cls: 'b-info' },
    ],
    aiTitle: 'Próximas oportunidades',
    aiSubtitle: 'cliente engajada · histórico denso · não force a venda',
    aiSuggestions: [
      {
        tone: 'ok',
        glyph: 'gift',
        title: 'Cross-sell: brincos pra fechar o conjunto do anel',
        body: 'Comprou o anel solitário em jan. Tem 4 pares de brinco do mesmo estilo curador no estoque, 2 com folga. Clientes parecidas (12) compraram em média 1,8 brinco por anel. Ela já tem a tag "prefere brincos".',
        evidence: 'similaridade: 0,82 · n=12',
        cta: 'Montar campanha 1-a-1',
        ctaClass: 'primary',
      },
      {
        tone: 'warn',
        glyph: 'shield',
        title: 'Garantia do anel expira em 18 dias',
        body: 'Oferecer extensão de 12 meses por R$ 89. Em coortes parecidas, 4 de 7 aceitaram. Margem 71%. Se preferir, mande só o lembrete (sem oferta paga).',
        evidence: 'aceite esperado: 57% ± 14pp',
        cta: 'Enviar oferta',
        ctaClass: 'secondary',
        secondary: 'Só lembrete',
      },
      {
        tone: 'info',
        glyph: 'cake',
        title: 'Aniversário em 14 jul (12 semanas)',
        body: 'Agendar lembrete pra mandar cupom -10% 5 dias antes. Mensagem usa o tom "casual caloroso" definido na Aparência.',
        evidence: null,
        cta: 'Agendar',
        ctaClass: 'ghost',
      },
    ],
    orders: [
      { id: 'PED-00171', when: '12 abr 2026', total: 'R$ 290,00',   status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00149', when: '8 mar 2026',  total: 'R$ 1.890,00', status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00128', when: '14 fev 2026', total: 'R$ 480,00',   status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00112', when: '22 jan 2026', total: 'R$ 2.490,00', status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00097', when: '5 dez 2025',  total: 'R$ 380,00',   status: 'Entregue', statusClass: 'b-success' },
    ],
  },

  atrisk: {
    id: 'atrisk',
    name: 'Carolina Paixão',
    initials: 'CP',
    email: 'carolina.p@email.com',
    since: 'agosto 2023',
    ordersCount: 7,
    rfm: { label: 'At Risk', code: '2/4/4', color: 'atrisk' },
    pitch: 'Era cliente recorrente · não compra há 4 meses · última visita ao site faz 23 dias (carrinho com pulseira esquecido).',
    stats: { ltv: 'R$ 4.890', orders: '7', aov: 'R$ 698', recency: '127d' },
    phone: '+55 11 99214-3387',
    address: ['Av. Brigadeiro, 1402 · sala 18', 'Jardins · São Paulo · SP', '01451-000 · BR'],
    tags: [
      { label: 'em risco', cls: 'b-warn' },
      { label: 'comprou pulseiras', cls: 'b-neutral' },
      { label: 'aberta last newsletter', cls: 'b-neutral' },
    ],
    aiTitle: 'Reativação · janela curta',
    aiSubtitle: 'silenciosa há 4 meses, mas ainda abre e-mails — vale tentar UMA vez',
    aiSuggestions: [
      {
        tone: 'warn',
        glyph: 'clock',
        title: 'Carrinho abandonado há 23 dias · pulseira de R$ 920',
        body: 'Item ainda no estoque. Clientes em "At Risk" reabriram o carrinho 19% das vezes quando recebem mensagem manual (não automatizada). Sugiro tom pessoal, sem cupom — só lembrete da peça e oferta de tirar dúvida.',
        evidence: 'taxa de retorno: 19% · n=58 (últimos 90d)',
        cta: 'Escrever DM personalizada',
        ctaClass: 'primary',
        secondary: 'Mandar e-mail simples',
      },
      {
        tone: 'info',
        glyph: 'spark',
        title: 'Cupom só se ela responder',
        body: 'Não recomendo mandar cupom de cara — Carolina nunca usou cupom de desconto, e o ticket dela é alto. Mais eficaz: oferecer cupom SE ela responder a primeira mensagem. Aumenta conversão sem queimar margem.',
        evidence: 'baseado em comportamento histórico dela',
        cta: 'Configurar regra condicional',
        ctaClass: 'ghost',
      },
      {
        tone: 'neutral',
        glyph: 'minus',
        title: 'Não enviar para a campanha de massa',
        body: 'Carolina recebeu 3 e-mails de campanha sem abrir os 2 últimos. Excluí-la temporariamente das campanhas em massa evita queimar reputação de envio e deixa espaço pro 1-a-1.',
        evidence: null,
        cta: 'Pausar campanhas em massa',
        ctaClass: 'ghost',
      },
    ],
    orders: [
      { id: 'PED-00088', when: '18 dez 2025', total: 'R$ 920,00',   status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00071', when: '4 nov 2025',  total: 'R$ 540,00',   status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00059', when: '22 set 2025', total: 'R$ 1.180,00', status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00041', when: '14 ago 2025', total: 'R$ 290,00',   status: 'Entregue', statusClass: 'b-success' },
    ],
  },

  lost: {
    id: 'lost',
    name: 'Diana Vilela',
    initials: 'DV',
    email: 'di.vilela@email.com',
    since: 'outubro 2022',
    ordersCount: 3,
    rfm: { label: 'Lost', code: '1/2/2', color: 'lost' },
    pitch: 'Comprou 3 vezes em 2022/2023 · sumiu há 14 meses · não abre nada há 8 meses.',
    stats: { ltv: 'R$ 1.870', orders: '3', aov: 'R$ 623', recency: '438d' },
    phone: '+55 21 99812-4467',
    address: ['Rua Visconde de Pirajá, 88', 'Ipanema · Rio de Janeiro · RJ', '22410-002 · BR'],
    tags: [
      { label: 'perdida', cls: 'b-error' },
      { label: 'Rio de Janeiro', cls: 'b-neutral' },
      { label: 'comprou anel', cls: 'b-neutral' },
    ],
    aiTitle: 'Provavelmente fora · só pra higiene de base',
    aiSubtitle: 'baixa probabilidade de retorno — não vale gastar atenção 1-a-1',
    aiSuggestions: [
      {
        tone: 'neutral',
        glyph: 'minus',
        title: 'Marcar pra remoção da base ativa',
        body: 'Sem abertura há 8 meses · sem clique há 11. Remover da base de envio ativa melhora deliverability e reduz custo. Mantemos ela no histórico — se voltar ao site organicamente, retorna pra base automaticamente.',
        evidence: 'taxa de reativação esperada: < 1,5%',
        cta: 'Mover pra "inativa"',
        ctaClass: 'secondary',
      },
      {
        tone: 'info',
        glyph: 'mail',
        title: 'Última tentativa: e-mail "podemos parar?" (opcional)',
        body: 'Algumas marcas mandam UM último e-mail estilo "queremos te ouvir antes de parar de mandar nossas novidades". Em coortes nossas, gerou retorno em 0,8%. Funciona mais como gesto de marca do que como reativação real.',
        evidence: 'retorno: 0,8% · 12 lojas comparadas',
        cta: 'Usar template',
        ctaClass: 'ghost',
        secondary: 'Pular',
      },
      {
        tone: 'warn',
        glyph: 'shield',
        title: 'LGPD · revisar dados há > 24 meses sem interação',
        body: 'Por boa prática (não obrigação), reveja se ela ainda quer estar na sua base. O texto da última tentativa pode incluir o link de "remover meu cadastro" pra tornar isso explícito.',
        evidence: null,
        cta: 'Ver texto sugerido',
        ctaClass: 'ghost',
      },
    ],
    orders: [
      { id: 'PED-00031', when: '18 fev 2025', total: 'R$ 480,00', status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00018', when: '5 dez 2024',  total: 'R$ 720,00', status: 'Entregue', statusClass: 'b-success' },
      { id: 'PED-00009', when: '22 out 2024', total: 'R$ 670,00', status: 'Entregue', statusClass: 'b-success' },
    ],
  },

  newb: {
    id: 'newb',
    name: 'Júlia Tavares',
    initials: 'JT',
    email: 'ju.tavares@email.com',
    since: 'há 9 dias',
    ordersCount: 1,
    rfm: { label: 'New', code: '5/1/3', color: 'new' },
    pitch: 'Primeira compra ontem · veio do Instagram (post da coleção Outono) · comentou 3x antes de comprar.',
    stats: { ltv: 'R$ 380', orders: '1', aov: 'R$ 380', recency: '1d' },
    phone: '+55 31 98765-1122',
    address: ['Rua Espírito Santo, 567', 'Savassi · Belo Horizonte · MG', '30160-030 · BR'],
    tags: [
      { label: 'nova', cls: 'b-info' },
      { label: 'veio do Instagram', cls: 'b-neutral' },
      { label: 'comprou brinco', cls: 'b-neutral' },
    ],
    aiTitle: 'Primeiros 90 dias · janela de retenção',
    aiSubtitle: 'agora é onde você ganha ou perde o segundo pedido',
    aiSuggestions: [
      {
        tone: 'ok',
        glyph: 'spark',
        title: 'Mensagem pessoal pós-entrega (em 5–7 dias)',
        body: 'Pacote chega quinta. Sugiro DM curta de você — não automatizada — perguntando se chegou bem. Marcas pequenas têm 2,3× mais retorno em 60d quando o segundo touch é manual e não comercial.',
        evidence: 'retorno em 60d: +130% · n=2.4k',
        cta: 'Lembrar em 6 dias',
        ctaClass: 'primary',
        secondary: 'Mandar template',
      },
      {
        tone: 'info',
        glyph: 'gift',
        title: 'Recomendação de produto · só depois da entrega',
        body: 'Com base no brinco que ela comprou, 3 anéis fariam combinação. Mas não recomendo mandar antes da entrega — recomendação pré-entrega no primeiro pedido converte mal e parece pressa. Espere 14 dias.',
        evidence: 'AOV em 90d: R$ 380 → R$ 720 (potencial)',
        cta: 'Agendar pra 9 mai',
        ctaClass: 'secondary',
      },
      {
        tone: 'neutral',
        glyph: 'mail',
        title: 'Fluxo de boas-vindas já rodando',
        body: 'Ela está no fluxo "primeira compra" (3 e-mails ao longo de 14 dias). 1º já foi (NF-e + agradecimento). Não duplique conteúdo — se for mandar algo manual, mande coisa NOVA.',
        evidence: '1/3 enviado · próximo: 30 abr',
        cta: 'Ver fluxo',
        ctaClass: 'ghost',
      },
    ],
    orders: [
      { id: 'PED-00184', when: 'ontem · 14:32', total: 'R$ 380,00', status: 'Em trânsito', statusClass: 'b-info' },
    ],
  },
};

// ─── Suggestion glyphs ───────────────────────────────────────────────────
function SuggestionGlyph({ name, tone }) {
  const paths = {
    gift:   <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>,
    cake:   <><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s1.5-2 4-2 2.5 2 4 2 1.5-2 4-2 4 2 4 2"/><path d="M2 21h20M7 8v3M12 8v3M17 8v3"/></>,
    clock:  <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
    spark:  <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>,
    minus:  <line x1="6" y1="12" x2="18" y2="12"/>,
    mail:   <><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></>,
  };
  return (
    <span className={`ai-suggest-icon ${tone}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.spark}</svg>
    </span>
  );
}

function Customer() {
  const [personaId, setPersonaId] = useStateC('champion');
  const [tab, setTab] = useStateC('orders');
  const p = PERSONAS[personaId];

  return (
    <main className="main">
      {/* Persona switcher (admin demo only) */}
      <div className="persona-switcher">
        <span className="persona-eyebrow">RFM segment · demo</span>
        <div className="persona-pills">
          {[
            ['champion', 'Champion', '5/5/4'],
            ['atrisk',   'At Risk',  '2/4/4'],
            ['lost',     'Lost',     '1/2/2'],
            ['newb',     'New',      '5/1/3'],
          ].map(([id, label, code]) => (
            <button key={id} className={`persona-pill p-${id} ${personaId === id ? 'on' : ''}`} onClick={() => setPersonaId(id)}>
              <span className="pp-label">{label}</span>
              <span className="pp-code mono">{code}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>{p.name}</h1>
          <p className="sub">Cliente desde {p.since} · {p.ordersCount} {p.ordersCount === 1 ? 'pedido' : 'pedidos'}</p>
        </div>
        <div className="actions">
          <button className="btn secondary">Nova mensagem</button>
          <button className="btn primary">+ Pedido manual</button>
        </div>
      </div>

      <div className="cust-grid">
        <aside>
          <div className="cust-card">
            <div className={`avatar-lg avatar-${p.rfm.color}`}>{p.initials}</div>
            <h3>{p.name}</h3>
            <div className="email">{p.email}</div>
            <span className={`rfm-pill rfm-${p.rfm.color}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/></svg>
              {p.rfm.label} · RFM {p.rfm.code}
            </span>
            <p style={{ fontSize: 12, color: 'var(--fg-secondary)', margin: 0, lineHeight: 1.5 }}>
              {p.pitch}
            </p>
            <div className="stats">
              <div className="stat"><div className="v mono">{p.stats.ltv}</div><div className="l">LTV</div></div>
              <div className="stat"><div className="v mono">{p.stats.orders}</div><div className="l">Pedidos</div></div>
              <div className="stat"><div className="v mono">{p.stats.aov}</div><div className="l">Ticket médio</div></div>
              <div className="stat"><div className="v mono">{p.stats.recency}</div><div className="l">Recência</div></div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <h4 className="cust-section-h">Contato</h4>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg-secondary)' }}>
              <div style={{ color: 'var(--fg)' }}>{p.phone}</div>
              {p.address.map((l, i) => <div key={i} className={i === p.address.length - 1 ? 'mono' : ''}>{l}</div>)}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <h4 className="cust-section-h">Tags</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {p.tags.map(t => <span key={t.label} className={`badge ${t.cls}`}>{t.label}</span>)}
            </div>
          </div>
        </aside>

        <div>
          {/* AI Suggestions card */}
          <div className={`ai-suggest-card ai-suggest-${p.rfm.color}`}>
            <div className="ai-suggest-head">
              <span className="ai-suggest-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
                IA · {p.aiTitle}
              </span>
              <span className="ai-suggest-meta">{p.aiSubtitle}</span>
            </div>
            <div className="ai-suggest-body">
              {p.aiSuggestions.map((s, i) => (
                <div key={i} className="ai-suggest-item">
                  <SuggestionGlyph name={s.glyph} tone={s.tone}/>
                  <div className="ai-suggest-text">
                    <strong>{s.title}</strong>
                    <span>{s.body}</span>
                    {s.evidence && <span className="ai-evidence mono">↳ {s.evidence}</span>}
                  </div>
                  <div className="ai-suggest-actions">
                    <button className={`btn ${s.ctaClass} sm`}>{s.cta}</button>
                    {s.secondary && <button className="btn ghost sm">{s.secondary}</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="ai-suggest-foot">
              <span className="mono">Haiku · 0,4¢ · 142 tokens</span>
              <span className="ai-foot-actions">
                <button className="btn-link">Por que isso?</button>
                <span>·</span>
                <button className="btn-link">Sugestões úteis?</button>
                <span className="thumbs"><span>👍</span><span>👎</span></span>
              </span>
            </div>
          </div>

          <div className="detail-tabs">
            {[
              ['orders',    `Pedidos · ${p.orders.length}`],
              ['warranty',  'Garantias · 3'],
              ['tickets',   'Tickets · 1'],
              ['marketing', 'Marketing'],
              ['notes',     'Notas internas'],
            ].map(([id, label]) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          {tab === 'orders' && (
            <div className="card">
              <table className="table">
                <thead><tr><th>Pedido</th><th>Data</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {p.orders.map(o => (
                    <tr key={o.id}>
                      <td className="mono" style={{ fontWeight: 500 }}>#{o.id}</td>
                      <td style={{ color: 'var(--fg-secondary)' }}>{o.when}</td>
                      <td><span className={`badge ${o.statusClass}`}><span className="dot"/>{o.status}</span></td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 500 }}>{o.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'warranty' && (
            <div>
              <div className="warranty-row warn">
                <div className="thumb"/>
                <div>
                  <div style={{ fontWeight: 500 }}>Anel Solitário Ouro 18k · ANL-OR18-001</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>Garantia 12 meses · pedido #PED-00112 (22 jan 2026)</div>
                </div>
                <span className="badge b-warn"><span className="dot"/>Expira em 18 dias</span>
              </div>
              <div className="warranty-row">
                <div className="thumb"/>
                <div>
                  <div style={{ fontWeight: 500 }}>Pulseira Veneziana Prata · PUL-PRT-022</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>Garantia 6 meses · pedido #PED-00149 (8 mar 2026)</div>
                </div>
                <span className="badge b-success"><span className="dot"/>3 meses restantes</span>
              </div>
              <div className="warranty-row">
                <div className="thumb"/>
                <div>
                  <div style={{ fontWeight: 500 }}>Brinco Pérola Prata 950 · BRC-PRT-014</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>Garantia 6 meses · pedido #PED-00128 (14 fev 2026)</div>
                </div>
                <span className="badge b-success"><span className="dot"/>2 meses restantes</span>
              </div>
            </div>
          )}

          {tab === 'tickets' && (
            <div className="card"><div className="card-body">
              <div style={{ display: 'flex', gap: 14, padding: '14px 0' }}>
                <span className="badge b-warn"><span className="dot"/>Em aberto</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>Fecho da pulseira veio quebrado</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 4 }}>Aberto há 2 dias · Camila atendendo · pedido #PED-00171</div>
                </div>
                <button className="btn secondary sm">Abrir →</button>
              </div>
            </div></div>
          )}

          {tab === 'marketing' && (
            <div className="card"><div className="card-body" style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}>E-mails promocionais</span>
                <Toggle on={true} onChange={() => {}}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}>WhatsApp marketing</span>
                <Toggle on={true} onChange={() => {}}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}>SMS</span>
                <Toggle on={false} onChange={() => {}}/>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, fontSize: 12, color: 'var(--fg-secondary)' }}>
                Última campanha aberta: <strong style={{ color: 'var(--fg)' }}>Coleção Outono 2026</strong> · há 8 dias
              </div>
            </div></div>
          )}

          {tab === 'notes' && (
            <div className="card"><div className="card-body">
              <textarea placeholder="Anotações privadas sobre essa cliente — só sua equipe vê." style={{ width: '100%', minHeight: 120, border: '1px solid var(--border-strong)', borderRadius: 8, padding: 12, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5, resize: 'vertical', outline: 'none' }} defaultValue="Cliente fiel desde 2024. Compra brincos pra ela e anéis pra mãe. Já indicou 3 amigas. Sempre comenta no Insta."/>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn primary sm">Salvar nota</button>
                <span style={{ fontSize: 11, color: 'var(--fg-secondary)', alignSelf: 'center' }}>Última edição: Marina · há 14 dias</span>
              </div>
            </div></div>
          )}
        </div>
      </div>
    </main>
  );
}

window.Customer = Customer;
