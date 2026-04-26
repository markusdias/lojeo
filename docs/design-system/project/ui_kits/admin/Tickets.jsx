// Tickets.jsx — Lojeo admin · suporte / atendimento
// Lista (filtros) + detalhe (drawer) com timeline conversa, SLA, sidebar cliente.
const { useState: useStateT } = React;

const TICKETS = [
  {
    id: 'TK-2847', subject: 'Fecho da pulseira veio quebrado', customer: 'Beatriz Lima', cInitials: 'BL',
    order: 'PED-00171', status: 'aberto', statusLabel: 'Aberto', priority: 'alta', priLabel: 'Alta',
    assignee: { name: 'Camila', initials: 'CR', color: '#A855F7' },
    sla: { state: 'urgent', label: 'Vence em 2h 14m' },
    lastUpdate: 'há 8 min', lastBy: 'cliente', preview: 'Oi, recebi a pulseira hoje mas o fecho está com defeito — não fecha direito.',
    unread: true,
  },
  {
    id: 'TK-2846', subject: 'Quero trocar tamanho do anel — comprei 16, preciso 18', customer: 'Marina Castro', cInitials: 'MC',
    order: 'PED-00184', status: 'andamento', statusLabel: 'Em andamento', priority: 'media', priLabel: 'Média',
    assignee: { name: 'Rafa', initials: 'RS', color: '#F59E0B' },
    sla: { state: 'ok', label: 'Vence em 1d 4h' },
    lastUpdate: 'há 1h', lastBy: 'equipe', preview: 'Marina, etiqueta de devolução já enviada por e-mail. Avisa quando postar.',
    unread: false,
  },
  {
    id: 'TK-2845', subject: 'Cupom BEMVINDA10 não aplica no carrinho', customer: 'Júlia Tavares', cInitials: 'JT',
    order: null, status: 'aguardando', statusLabel: 'Aguardando cliente', priority: 'baixa', priLabel: 'Baixa',
    assignee: { name: 'Camila', initials: 'CR', color: '#A855F7' },
    sla: { state: 'ok', label: 'Sem SLA · aguardando' },
    lastUpdate: 'há 6h', lastBy: 'equipe', preview: 'Pode tentar agora? Acabamos de revalidar o cupom no painel.',
    unread: false,
  },
  {
    id: 'TK-2844', subject: 'Onde meu pedido está? Já passou da data prevista', customer: 'Carolina Paixão', cInitials: 'CP',
    order: 'PED-00088', status: 'aberto', statusLabel: 'Aberto', priority: 'urgente', priLabel: 'Urgente',
    assignee: null,
    sla: { state: 'late', label: 'Atrasado · 5h 32m' },
    lastUpdate: 'há 5h', lastBy: 'cliente', preview: 'Faz 3 dias que tá "objeto postado", isso é normal? Era pra entregar ontem.',
    unread: true,
  },
  {
    id: 'TK-2843', subject: 'Dúvida sobre tamanho do brinco · cabe pra orelha furada recente?', customer: 'Patrícia Mendes', cInitials: 'PM',
    order: null, status: 'andamento', statusLabel: 'Em andamento', priority: 'baixa', priLabel: 'Baixa',
    assignee: { name: 'IA · FaqZap', initials: '✨', color: '#00553D' },
    sla: { state: 'ok', label: 'Vence em 6h' },
    lastUpdate: 'há 12 min', lastBy: 'bot', preview: '[FaqZap] Olá Patrícia! O brinco mede 8mm — adequado pra furos recentes…',
    unread: false,
  },
  {
    id: 'TK-2842', subject: 'NF-e não chegou no e-mail', customer: 'Diana Vilela', cInitials: 'DV',
    order: 'PED-00031', status: 'resolvido', statusLabel: 'Resolvido', priority: 'media', priLabel: 'Média',
    assignee: { name: 'Rafa', initials: 'RS', color: '#F59E0B' },
    sla: { state: 'done', label: 'Resolvido · em 3h 14m' },
    lastUpdate: 'há 2 dias', lastBy: 'equipe', preview: 'Reenviei a NF-e — chegou? Qualquer coisa avisa por aqui.',
    unread: false,
  },
];

const RESPONSE_TEMPLATES = [
  { id: 't1', label: 'Reenviar etiqueta', body: 'Oi {nome}! Te mandei a etiqueta de devolução pelo e-mail agora — pedido {pedido}. Posta quando der e me avisa por aqui pra acompanhar.' },
  { id: 't2', label: 'Pedido com atraso', body: 'Oi {nome}, lamento pelo atraso. Acompanhei o rastreio do {pedido} e a transportadora confirmou previsão pra {data}. Se passar disso, me avise — abrimos reenvio sem custo.' },
  { id: 't3', label: 'Defeito de fabricação', body: 'Oi {nome}, sinto muito pelo problema com {produto}. Vamos trocar — sem custo. Te mando a etiqueta agora.' },
  { id: 't4', label: 'Cupom não aplica', body: 'Oi {nome}! Acabei de validar o cupom — pode tentar novamente? Às vezes é só o cache do navegador.' },
];

function Tickets() {
  const [filter, setFilter] = useStateT('todos');
  const [openId, setOpenId] = useStateT(null);
  const [composer, setComposer] = useStateT('');
  const [showTemplates, setShowTemplates] = useStateT(false);
  const [internalNote, setInternalNote] = useStateT(false);

  const open = TICKETS.find(t => t.id === openId);

  const filtered = TICKETS.filter(t => {
    if (filter === 'todos') return true;
    if (filter === 'meus') return t.assignee?.name === 'Camila';
    if (filter === 'sem') return !t.assignee;
    return t.status === filter;
  });

  const counts = {
    todos: TICKETS.length,
    aberto: TICKETS.filter(t => t.status === 'aberto').length,
    andamento: TICKETS.filter(t => t.status === 'andamento').length,
    aguardando: TICKETS.filter(t => t.status === 'aguardando').length,
    resolvido: TICKETS.filter(t => t.status === 'resolvido').length,
    sem: TICKETS.filter(t => !t.assignee).length,
  };

  return (
    <main className="main">
      <div className="page-header">
        <div>
          <h1>Tickets</h1>
          <p className="sub">{counts.aberto + counts.andamento} ativos · {TICKETS.filter(t => t.sla.state === 'late').length} atrasado · SLA médio: 3h 41min</p>
        </div>
        <div className="actions">
          <button className="btn secondary">Regras de roteamento</button>
          <button className="btn primary">+ Ticket manual</button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        {[
          ['todos', 'Todos'],
          ['aberto', 'Abertos'],
          ['andamento', 'Em andamento'],
          ['aguardando', 'Aguardando cliente'],
          ['resolvido', 'Resolvidos'],
          ['sem', 'Não atribuídos'],
        ].map(([id, label]) => (
          <button key={id} className={`chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
            {label} <span className="chip-count">{counts[id]}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn ghost sm">Prioridade ▾</button>
          <button className="btn ghost sm">SLA ▾</button>
          <button className="btn ghost sm">Responsável ▾</button>
        </div>
      </div>

      {/* Tickets list */}
      <div className="tickets-list">
        {filtered.map(t => (
          <button key={t.id} className={`ticket-row ${t.unread ? 'unread' : ''} ${openId === t.id ? 'active' : ''}`} onClick={() => setOpenId(t.id)}>
            <div className={`ticket-pri ticket-pri-${t.priority}`} title={`Prioridade: ${t.priLabel}`}/>
            <div className="ticket-main">
              <div className="ticket-row-head">
                <span className="ticket-id mono">{t.id}</span>
                <TicketStatusBadge status={t.status} label={t.statusLabel}/>
                {t.order && <span className="ticket-order mono">#{t.order}</span>}
                <span className={`ticket-sla ticket-sla-${t.sla.state}`}>
                  {t.sla.state === 'urgent' && <span className="sla-pulse"/>}
                  {t.sla.label}
                </span>
              </div>
              <div className="ticket-subject">{t.subject}</div>
              <div className="ticket-preview">
                <span className="ticket-preview-by">
                  {t.lastBy === 'cliente' && <><strong>{t.customer}:</strong> </>}
                  {t.lastBy === 'equipe' && <><strong>{t.assignee.name}:</strong> </>}
                  {t.lastBy === 'bot' && <><strong>FaqZap (IA):</strong> </>}
                </span>
                {t.preview}
              </div>
            </div>
            <div className="ticket-meta">
              <div className="ticket-customer">
                <div className="avatar avatar-sm">{t.cInitials}</div>
                <span>{t.customer}</span>
              </div>
              <div className="ticket-time mono">{t.lastUpdate}</div>
              {t.assignee ? (
                <div className="ticket-assignee" style={{ background: t.assignee.color }}>{t.assignee.initials}</div>
              ) : (
                <div className="ticket-assignee unassigned">?</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Detail drawer */}
      {open && (
        <>
          <div className="ticket-backdrop" onClick={() => setOpenId(null)}/>
          <TicketDetail
            ticket={open}
            onClose={() => setOpenId(null)}
            composer={composer} setComposer={setComposer}
            showTemplates={showTemplates} setShowTemplates={setShowTemplates}
            internalNote={internalNote} setInternalNote={setInternalNote}
          />
        </>
      )}
    </main>
  );
}

function TicketStatusBadge({ status, label }) {
  const cls = {
    aberto: 'b-info', andamento: 'b-warn', aguardando: 'b-neutral', resolvido: 'b-success',
  }[status] || 'b-neutral';
  return <span className={`badge ${cls}`}><span className="dot"/>{label}</span>;
}

// ─── Detail drawer ────────────────────────────────────────────────
function TicketDetail({ ticket, onClose, composer, setComposer, showTemplates, setShowTemplates, internalNote, setInternalNote }) {
  // Conversation timeline (ticket-specific would come from backend; here we use a rich example for TK-2847)
  const conversation = ticket.id === 'TK-2847' ? [
    { kind: 'system', text: `Ticket aberto via formulário do site · vinculado ao pedido #${ticket.order}`, time: 'há 3h 12min' },
    { kind: 'customer', author: ticket.customer, initials: ticket.cInitials, time: 'há 3h 10min',
      text: 'Oi, recebi a pulseira hoje mas o fecho está com defeito — não fecha direito. Tem como trocar?' },
    { kind: 'order-card', order: ticket.order, status: 'Entregue', total: 'R$ 290,00', item: 'Pulseira Veneziana Prata' },
    { kind: 'note', author: 'Camila', initials: 'CR', color: '#A855F7', time: 'há 2h 50min',
      text: 'Vou pedir foto do fecho antes de aprovar troca — política da loja exige evidência pra defeitos de fabricação.' },
    { kind: 'team', author: 'Camila', initials: 'CR', color: '#A855F7', time: 'há 2h 48min',
      text: 'Oi Beatriz, sinto muito pelo problema! Pode mandar uma foto do fecho? Assim que receber, mando a etiqueta de devolução pra você.' },
    { kind: 'customer', author: ticket.customer, initials: ticket.cInitials, time: 'há 12min',
      text: 'Mandei a foto — o gancho está torto, tá vendo? Já tentei várias vezes e não fecha mesmo.', attachment: 'foto-fecho.jpg' },
    { kind: 'bot', author: 'FaqZap', time: 'há 8min',
      text: 'Análise da foto: defeito de fabricação visível no gancho do fecho. Sugestão: aprovar troca + enviar etiqueta + alertar QA do fornecedor.', confidence: 92 },
  ] : [
    { kind: 'system', text: `Ticket aberto · vinculado ao pedido #${ticket.order || '—'}`, time: 'há 5h' },
    { kind: 'customer', author: ticket.customer, initials: ticket.cInitials, time: 'há 5h', text: ticket.preview },
  ];

  const insertTemplate = (body) => {
    const filled = body
      .replace('{nome}', ticket.customer.split(' ')[0])
      .replace('{pedido}', ticket.order || '—')
      .replace('{produto}', 'sua peça')
      .replace('{data}', '28 abr');
    setComposer(filled);
    setShowTemplates(false);
  };

  return (
    <aside className="ticket-drawer">
      {/* Header */}
      <div className="td-head">
        <div className="td-head-top">
          <div>
            <span className="td-id mono">{ticket.id}</span>
            <TicketStatusBadge status={ticket.status} label={ticket.statusLabel}/>
            <span className={`td-priority td-pri-${ticket.priority}`}>● {ticket.priLabel}</span>
            <span className={`ticket-sla ticket-sla-${ticket.sla.state}`}>
              {ticket.sla.state === 'urgent' && <span className="sla-pulse"/>}
              {ticket.sla.label}
            </span>
          </div>
          <button className="td-close" onClick={onClose}>✕</button>
        </div>
        <h2 className="td-subject">{ticket.subject}</h2>
        <div className="td-head-meta">
          <span>Aberto há 3h 12min · via formulário do site</span>
          <span>·</span>
          <span>Última atividade: {ticket.lastUpdate}</span>
        </div>
      </div>

      {/* 2-col body */}
      <div className="td-body">
        {/* Conversation */}
        <div className="td-conversation">
          {conversation.map((m, i) => {
            if (m.kind === 'system') {
              return <div key={i} className="td-system">— {m.text} · <span className="mono">{m.time}</span> —</div>;
            }
            if (m.kind === 'order-card') {
              return (
                <div key={i} className="td-order-card">
                  <div className="td-order-thumb"/>
                  <div className="td-order-body">
                    <div className="td-order-head">
                      <span className="mono">#{m.order}</span>
                      <span className="badge b-success" style={{ fontSize: 10 }}><span className="dot"/>{m.status}</span>
                    </div>
                    <div className="td-order-item">{m.item}</div>
                    <div className="td-order-foot">
                      <span className="mono">{m.total}</span>
                      <a className="td-order-link">Abrir pedido →</a>
                    </div>
                  </div>
                </div>
              );
            }
            if (m.kind === 'note') {
              return (
                <div key={i} className="td-msg td-msg-note">
                  <div className="td-msg-side">
                    <div className="avatar avatar-sm" style={{ background: m.color }}>{m.initials}</div>
                  </div>
                  <div className="td-msg-bubble">
                    <div className="td-msg-meta">
                      <strong>{m.author}</strong>
                      <span className="td-note-tag">interna · não enviada ao cliente</span>
                      <span className="mono">{m.time}</span>
                    </div>
                    <div className="td-msg-text">{m.text}</div>
                  </div>
                </div>
              );
            }
            if (m.kind === 'bot') {
              return (
                <div key={i} className="td-msg td-msg-bot">
                  <div className="td-msg-side">
                    <div className="avatar avatar-sm td-bot-avatar">✨</div>
                  </div>
                  <div className="td-msg-bubble">
                    <div className="td-msg-meta">
                      <strong>{m.author}</strong>
                      <span className="td-bot-tag">via FaqZap · {m.confidence}% confiança</span>
                      <span className="mono">{m.time}</span>
                    </div>
                    <div className="td-msg-text">{m.text}</div>
                    <div className="td-bot-actions">
                      <button className="btn primary sm">Aprovar e responder</button>
                      <button className="btn ghost sm">Editar antes de enviar</button>
                      <button className="btn ghost sm">Descartar</button>
                    </div>
                  </div>
                </div>
              );
            }
            // customer or team
            const isCustomer = m.kind === 'customer';
            return (
              <div key={i} className={`td-msg ${isCustomer ? 'td-msg-customer' : 'td-msg-team'}`}>
                <div className="td-msg-side">
                  <div className="avatar avatar-sm" style={{ background: isCustomer ? '#6B7280' : m.color }}>{m.initials}</div>
                </div>
                <div className="td-msg-bubble">
                  <div className="td-msg-meta">
                    <strong>{m.author}</strong>
                    <span className="mono">{m.time}</span>
                  </div>
                  <div className="td-msg-text">{m.text}</div>
                  {m.attachment && (
                    <div className="td-msg-attachment">
                      <span className="td-att-thumb"/>
                      <span>{m.attachment}</span>
                      <span className="mono" style={{ marginLeft: 'auto', color: 'var(--fg-muted)' }}>1.2 MB</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="td-sidebar">
          <div className="td-side-card">
            <h4>Cliente</h4>
            <div className="td-cust">
              <div className="avatar" style={{ background: 'linear-gradient(135deg, #00553D, #34C796)', color: '#fff' }}>{ticket.cInitials}</div>
              <div>
                <div style={{ fontWeight: 500 }}>{ticket.customer}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{ticket.id === 'TK-2847' ? 'beatriz.lima@email.com' : 'cliente@email.com'}</div>
              </div>
            </div>
            <div className="td-cust-stats">
              <div><span className="l">RFM</span><span className="v">Champion</span></div>
              <div><span className="l">LTV</span><span className="v mono">R$ 8.420</span></div>
              <div><span className="l">Pedidos</span><span className="v mono">12</span></div>
              <div><span className="l">Recência</span><span className="v mono">28d</span></div>
            </div>
            <a className="td-side-link">Ver perfil completo →</a>
          </div>

          <div className="td-side-card">
            <h4>Atribuição</h4>
            <button className="td-assignee-btn">
              {ticket.assignee ? (
                <>
                  <div className="avatar avatar-sm" style={{ background: ticket.assignee.color }}>{ticket.assignee.initials}</div>
                  <div className="td-assignee-info">
                    <span style={{ fontWeight: 500 }}>{ticket.assignee.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Reatribuir ▾</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="avatar avatar-sm unassigned">?</div>
                  <div className="td-assignee-info">
                    <span style={{ fontWeight: 500 }}>Não atribuído</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Atribuir ▾</span>
                  </div>
                </>
              )}
            </button>
          </div>

          <div className="td-side-card">
            <h4>Ações rápidas</h4>
            <div className="td-actions-stack">
              <button className="btn secondary sm full">Criar reembolso</button>
              <button className="btn secondary sm full">Abrir troca</button>
              <button className="btn secondary sm full">Enviar etiqueta</button>
              <button className="btn primary sm full">Marcar resolvido</button>
            </div>
          </div>

          <div className="td-side-card">
            <h4>Histórico</h4>
            <div className="td-history">
              <div className="td-hist-item">
                <span className="td-hist-dot"/>
                <div>
                  <strong>Status: Aberto → Em andamento</strong>
                  <span>Camila · há 2h 50min</span>
                </div>
              </div>
              <div className="td-hist-item">
                <span className="td-hist-dot"/>
                <div>
                  <strong>Atribuído a Camila</strong>
                  <span>Auto · regra round-robin · há 3h</span>
                </div>
              </div>
              <div className="td-hist-item">
                <span className="td-hist-dot"/>
                <div>
                  <strong>Ticket criado</strong>
                  <span>Formulário do site · há 3h 12min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className={`td-composer ${internalNote ? 'is-note' : ''}`}>
        {showTemplates && (
          <div className="td-templates">
            <div className="td-templates-head">
              <span>Templates de resposta</span>
              <button className="td-close-sm" onClick={() => setShowTemplates(false)}>✕</button>
            </div>
            {RESPONSE_TEMPLATES.map(t => (
              <button key={t.id} className="td-template" onClick={() => insertTemplate(t.body)}>
                <strong>{t.label}</strong>
                <span>{t.body.slice(0, 80)}…</span>
              </button>
            ))}
          </div>
        )}
        {internalNote && (
          <div className="td-note-warn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
            Modo nota interna · só sua equipe vê
          </div>
        )}
        <textarea
          placeholder={internalNote ? 'Anotação interna pra equipe…' : `Responder pra ${ticket.customer.split(' ')[0]}…`}
          value={composer}
          onChange={e => setComposer(e.target.value)}
          rows={3}
        />
        <div className="td-composer-bar">
          <div className="td-composer-tools">
            <button className="td-tool" onClick={() => setShowTemplates(s => !s)} title="Templates">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              Templates
            </button>
            <button className="td-tool" title="Anexar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              Anexar
            </button>
            <label className={`td-tool td-toggle ${internalNote ? 'on' : ''}`}>
              <input type="checkbox" checked={internalNote} onChange={e => setInternalNote(e.target.checked)}/>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Nota interna
            </label>
          </div>
          <div className="td-composer-send">
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>⌘ + ↵ pra enviar</span>
            <button className={`btn ${internalNote ? 'secondary' : 'primary'}`} disabled={!composer.trim()}>
              {internalNote ? 'Salvar nota' : `Enviar pra ${ticket.customer.split(' ')[0]}`}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

window.Tickets = Tickets;
