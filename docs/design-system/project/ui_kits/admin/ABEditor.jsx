// ABEditor.jsx — Lojeo admin · A/B test editor
// Two views: list of experiments + detail with statistical significance.
// Microcopy IA é honesta: confiança real, "ainda inconclusivo", flags.

const { useState: useStateAB } = React;

const EXPERIMENTS = [
  {
    id: 'exp-018',
    code: 'EXP-018',
    name: 'Botão CTA · "Comprar agora" vs "Adicionar ao carrinho"',
    surface: 'Página de produto',
    status: 'running',
    statusLabel: 'Rodando',
    days: 9,
    daysTotal: 14,
    visitors: 2847,
    conversion: { a: 3.2, b: 4.1 },
    lift: 28.1,
    pValue: 0.018,
    confidence: 94.2,
    significant: true,
    winner: 'B',
  },
  {
    id: 'exp-017',
    code: 'EXP-017',
    name: 'Hero homepage · Imagem editorial vs vídeo de processo',
    surface: 'Homepage',
    status: 'running',
    statusLabel: 'Rodando',
    days: 4,
    daysTotal: 14,
    visitors: 1102,
    conversion: { a: 2.6, b: 2.8 },
    lift: 7.7,
    pValue: 0.31,
    confidence: 69.0,
    significant: false,
    winner: null,
  },
  {
    id: 'exp-016',
    code: 'EXP-016',
    name: 'Frete grátis: trigger em R$ 300 vs R$ 500',
    surface: 'Carrinho',
    status: 'completed',
    statusLabel: 'Concluído',
    days: 21,
    daysTotal: 21,
    visitors: 5621,
    conversion: { a: 5.1, b: 4.4 },
    lift: -13.7,
    pValue: 0.008,
    confidence: 99.2,
    significant: true,
    winner: 'A',
  },
  {
    id: 'exp-015',
    code: 'EXP-015',
    name: 'Checkout · 1 página vs 3 passos',
    surface: 'Checkout',
    status: 'completed',
    statusLabel: 'Concluído',
    days: 28,
    daysTotal: 28,
    visitors: 8420,
    conversion: { a: 41.2, b: 47.8 },
    lift: 16.0,
    pValue: 0.002,
    confidence: 99.8,
    significant: true,
    winner: 'B',
  },
  {
    id: 'exp-014',
    code: 'EXP-014',
    name: 'Selo "feito à mão" no card de produto',
    surface: 'Listagem',
    status: 'inconclusive',
    statusLabel: 'Inconclusivo',
    days: 21,
    daysTotal: 21,
    visitors: 3210,
    conversion: { a: 3.1, b: 3.2 },
    lift: 3.2,
    pValue: 0.78,
    confidence: 22.0,
    significant: false,
    winner: null,
  },
  {
    id: 'exp-013',
    code: 'EXP-013',
    name: 'E-mail boas-vindas: assunto "Oi, [nome]" vs "Sua loja te espera"',
    surface: 'Email · welcome',
    status: 'draft',
    statusLabel: 'Rascunho',
    days: 0,
    daysTotal: 14,
    visitors: 0,
    conversion: { a: 0, b: 0 },
    lift: 0,
    pValue: 1,
    confidence: 0,
    significant: false,
    winner: null,
  },
];

function ABStatusBadge({ status, label }) {
  const cls = {
    running:      'b-info',
    completed:    'b-success',
    inconclusive: 'b-warn',
    draft:        'b-neutral',
  }[status] || 'b-neutral';
  return <span className={`badge ${cls}`}><span className="dot"/>{label}</span>;
}

function ABList({ onOpen }) {
  return (
    <main className="main">
      <div className="page-header">
        <div>
          <h1>Experimentos A/B</h1>
          <p className="sub">{EXPERIMENTS.filter(e => e.status === 'running').length} rodando · {EXPERIMENTS.filter(e => e.status === 'completed').length} concluídos · 1 rascunho</p>
        </div>
        <div className="actions">
          <button className="btn secondary">Templates</button>
          <button className="btn primary">+ Novo experimento</button>
        </div>
      </div>

      {/* AI summary banner */}
      <div className="ab-ai-banner">
        <span className="ab-ai-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
          IA · resumo dos testes
        </span>
        <p>
          <strong>EXP-018 atingiu 94% de confiança</strong> ontem — pode ser declarado vencedor com baixo risco. Já o <strong>EXP-017</strong> está há 4 dias rodando mas com tráfego baixo (1.1k visitas); precisa de pelo menos +6 dias pra confiança ≥ 90%. <strong>EXP-014 ficou inconclusivo</strong> — diferença de 0,1pp não é detectável com esse tamanho de amostra; sugiro arquivar e testar variações maiores.
        </p>
        <div className="ab-ai-actions">
          <button className="btn primary sm">Declarar EXP-018 vencedor</button>
          <button className="btn ghost sm">Arquivar EXP-014</button>
          <span className="ab-ai-meta mono">Sonnet · 1,2¢ · análise estatística com correção de Bonferroni</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="filter-bar" style={{ marginTop: 16 }}>
        <button className="chip active">Todos <span className="chip-count">{EXPERIMENTS.length}</span></button>
        <button className="chip">Rodando <span className="chip-count">2</span></button>
        <button className="chip">Concluídos <span className="chip-count">2</span></button>
        <button className="chip">Inconclusivos <span className="chip-count">1</span></button>
        <button className="chip">Rascunhos <span className="chip-count">1</span></button>
        <button className="btn ghost sm" style={{ marginLeft: 'auto' }}>Filtros avançados</button>
      </div>

      {/* Experiments list */}
      <div className="ab-list">
        {EXPERIMENTS.map(e => (
          <button key={e.id} className="ab-row" onClick={() => onOpen(e.id)}>
            <div className="ab-row-head">
              <span className="ab-code mono">{e.code}</span>
              <ABStatusBadge status={e.status} label={e.statusLabel}/>
              <span className="ab-surface">{e.surface}</span>
            </div>
            <div className="ab-row-name">{e.name}</div>
            <div className="ab-row-stats">
              <div className="ab-stat">
                <span className="l">Visitantes</span>
                <span className="v mono">{e.visitors.toLocaleString('pt-BR')}</span>
              </div>
              <div className="ab-stat">
                <span className="l">Conversão A → B</span>
                <span className="v mono">{e.status === 'draft' ? '—' : `${e.conversion.a.toFixed(1)}% → ${e.conversion.b.toFixed(1)}%`}</span>
              </div>
              <div className="ab-stat">
                <span className="l">Lift</span>
                <span className={`v mono ${e.lift > 0 ? 'pos' : e.lift < 0 ? 'neg' : ''}`}>
                  {e.status === 'draft' ? '—' : `${e.lift > 0 ? '+' : ''}${e.lift.toFixed(1)}%`}
                </span>
              </div>
              <div className="ab-stat">
                <span className="l">Confiança</span>
                <span className={`v mono ${e.confidence >= 95 ? 'pos' : e.confidence >= 85 ? 'mid' : 'neg'}`}>
                  {e.status === 'draft' ? '—' : `${e.confidence.toFixed(1)}%`}
                </span>
              </div>
              <div className="ab-stat ab-stat-progress">
                <span className="l">Tempo</span>
                <span className="ab-progress">
                  <span className="ab-progress-track">
                    <span className="ab-progress-fill" style={{ width: `${(e.days / e.daysTotal) * 100}%` }}/>
                  </span>
                  <span className="v mono">{e.days}/{e.daysTotal}d</span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

function ABDetail({ id, onBack }) {
  const e = EXPERIMENTS.find(x => x.id === id) || EXPERIMENTS[0];

  // Generate fake daily data
  const days = Array.from({ length: e.days || 9 }, (_, i) => {
    const dayA = 2.5 + Math.sin(i * 0.7) * 0.8 + Math.random() * 0.3 + i * 0.05;
    const dayB = 3.4 + Math.sin(i * 0.6) * 0.6 + Math.random() * 0.4 + i * 0.08;
    return { i, a: dayA, b: dayB };
  });

  return (
    <main className="main">
      <div className="page-header">
        <div>
          <button className="btn-link" onClick={onBack} style={{ fontSize: 12, marginBottom: 6 }}>← Experimentos A/B</button>
          <h1>{e.name}</h1>
          <p className="sub">
            <span className="mono">{e.code}</span> · {e.surface} · {e.statusLabel}
            {e.status === 'running' && <> · <strong style={{ color: 'var(--fg)' }}>Dia {e.days} de {e.daysTotal}</strong></>}
          </p>
        </div>
        <div className="actions">
          {e.status === 'running' && e.significant && (
            <>
              <button className="btn secondary">Pausar</button>
              <button className="btn primary">Declarar B vencedor</button>
            </>
          )}
          {e.status === 'running' && !e.significant && (
            <>
              <button className="btn secondary">Pausar</button>
              <button className="btn ghost">Estender 7 dias</button>
            </>
          )}
          {e.status === 'completed' && <button className="btn secondary">Duplicar</button>}
          {e.status === 'inconclusive' && <button className="btn secondary">Arquivar</button>}
        </div>
      </div>

      {/* AI verdict banner */}
      <div className={`ab-verdict ab-verdict-${e.significant ? 'win' : (e.confidence >= 70 ? 'maybe' : 'no')}`}>
        <div className="ab-verdict-icon">
          {e.significant ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
        </div>
        <div className="ab-verdict-body">
          <div className="ab-verdict-head">
            <span className="ai-suggest-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
              Análise estatística IA
            </span>
            <span className="mono ab-verdict-conf">p = {e.pValue.toFixed(3)} · n = {e.visitors.toLocaleString('pt-BR')}</span>
          </div>
          <h3>
            {e.significant && e.winner === 'B' && <>Variante <strong>B</strong> venceu com {e.confidence.toFixed(1)}% de confiança</>}
            {e.significant && e.winner === 'A' && <>Variante <strong>A</strong> (controle) venceu — manter estado atual</>}
            {!e.significant && e.confidence >= 70 && <>Tendência pra <strong>{e.conversion.b > e.conversion.a ? 'B' : 'A'}</strong>, mas ainda não conclusivo</>}
            {!e.significant && e.confidence < 70 && <>Diferença não detectável com esse tamanho de amostra</>}
          </h3>
          <p>
            {e.significant && e.winner === 'B' && (
              <>Com {e.visitors.toLocaleString('pt-BR')} visitantes, B converteu {e.conversion.b.toFixed(1)}% contra {e.conversion.a.toFixed(1)}% de A — lift de +{e.lift.toFixed(1)}%. P-valor de {e.pValue.toFixed(3)} significa que a chance dessa diferença ser por acaso é de {(e.pValue * 100).toFixed(1)}%. <strong>Risco baixo de declarar vencedor agora.</strong></>
            )}
            {e.significant && e.winner === 'A' && (
              <>Frete grátis em R$ 300 (variante A) gerou +13,7% de conversão vs trigger em R$ 500. A explicação provável: barreira mais baixa pra atingir o frete grátis aumenta AOV via produtos adicionais. <strong>Mantenha o trigger em R$ 300.</strong></>
            )}
            {!e.significant && e.confidence >= 70 && (
              <>B está liderando com lift de {e.lift > 0 ? '+' : ''}{e.lift.toFixed(1)}%, mas o tráfego ainda é baixo ({e.visitors.toLocaleString('pt-BR')}). Pra atingir 95% de confiança, precisa de aproximadamente <strong>{Math.round(e.visitors * (95 / e.confidence))} visitantes adicionais</strong> — estimo +{Math.ceil(e.daysTotal - e.days)} dias mantendo o ritmo atual.</>
            )}
            {!e.significant && e.confidence < 70 && (
              <>Lift de apenas {e.lift > 0 ? '+' : ''}{e.lift.toFixed(1)}% com p-valor de {e.pValue.toFixed(2)} — provavelmente as duas variantes performam igual. <strong>Sugiro arquivar e testar diferenças maiores</strong> (ex: copy radicalmente diferente, layout em vez de selo).</>
            )}
          </p>
        </div>
      </div>

      {/* 3-col layout */}
      <div className="ab-detail-grid">
        {/* Variants */}
        <div className="card">
          <div className="card-header"><h3>Variantes</h3><span className="meta">tráfego 50/50</span></div>
          <div className="ab-variants">
            <div className={`ab-variant ${e.winner === 'A' ? 'winner' : ''}`}>
              <div className="ab-variant-head">
                <span className="ab-variant-tag">A · controle</span>
                {e.winner === 'A' && <span className="badge b-success"><span className="dot"/>Vencedor</span>}
              </div>
              <div className="ab-variant-mock">
                <div className="abm-bar"/>
                <div className="abm-img"/>
                <div className="abm-text"/>
                <div className="abm-text short"/>
                <button className="abm-cta primary-mock">Adicionar ao carrinho</button>
              </div>
              <div className="ab-variant-stats">
                <div><span className="l">Conversão</span><span className="v mono">{e.conversion.a.toFixed(2)}%</span></div>
                <div><span className="l">Visitantes</span><span className="v mono">{Math.floor(e.visitors / 2).toLocaleString('pt-BR')}</span></div>
                <div><span className="l">Pedidos</span><span className="v mono">{Math.floor((e.visitors / 2) * (e.conversion.a / 100))}</span></div>
              </div>
            </div>
            <div className={`ab-variant ${e.winner === 'B' ? 'winner' : ''}`}>
              <div className="ab-variant-head">
                <span className="ab-variant-tag">B · teste</span>
                {e.winner === 'B' && <span className="badge b-success"><span className="dot"/>Vencedor</span>}
              </div>
              <div className="ab-variant-mock">
                <div className="abm-bar"/>
                <div className="abm-img"/>
                <div className="abm-text"/>
                <div className="abm-text short"/>
                <button className="abm-cta accent-mock">Comprar agora</button>
              </div>
              <div className="ab-variant-stats">
                <div><span className="l">Conversão</span><span className="v mono">{e.conversion.b.toFixed(2)}%</span></div>
                <div><span className="l">Visitantes</span><span className="v mono">{Math.floor(e.visitors / 2).toLocaleString('pt-BR')}</span></div>
                <div><span className="l">Pedidos</span><span className="v mono">{Math.floor((e.visitors / 2) * (e.conversion.b / 100))}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Confidence gauge */}
        <div className="card ab-conf-card">
          <div className="card-header"><h3>Confiança estatística</h3></div>
          <div className="card-body">
            <ABConfidenceGauge value={e.confidence}/>
            <div className="ab-conf-stats">
              <div><span className="l">P-valor</span><span className="v mono">{e.pValue.toFixed(3)}</span></div>
              <div><span className="l">Lift relativo</span><span className={`v mono ${e.lift > 0 ? 'pos' : 'neg'}`}>{e.lift > 0 ? '+' : ''}{e.lift.toFixed(1)}%</span></div>
              <div><span className="l">Erro padrão</span><span className="v mono">±{(0.42).toFixed(2)}pp</span></div>
              <div><span className="l">Power</span><span className="v mono">{e.confidence >= 95 ? '0,82' : '0,61'}</span></div>
            </div>
            <div className="ab-conf-foot">
              {e.confidence >= 95 && <span className="ab-foot-ok">✓ Limiar de 95% atingido — pode declarar vencedor</span>}
              {e.confidence >= 85 && e.confidence < 95 && <span className="ab-foot-mid">↗ Quase lá — estimativa: +3 dias pra ≥ 95%</span>}
              {e.confidence < 85 && <span className="ab-foot-low">⚠ Abaixo do limiar — precisa mais tempo ou amostra maior</span>}
            </div>
          </div>
        </div>

        {/* Daily chart */}
        <div className="card ab-chart-card">
          <div className="card-header">
            <h3>Conversão dia a dia</h3>
            <span className="meta">A vs B · acumulado</span>
          </div>
          <div className="card-body">
            <ABDailyChart days={days}/>
            <div className="ab-chart-legend">
              <span><span className="dot dot-a"/>Variante A · controle</span>
              <span><span className="dot dot-b"/>Variante B · teste</span>
              <span><span className="dot dot-thresh"/>Limiar 95% confiança</span>
            </div>
          </div>
        </div>

        {/* Segments breakdown */}
        <div className="card ab-segments-card">
          <div className="card-header">
            <h3>Quebra por segmento</h3>
            <span className="meta">onde B ganha mais ou menos</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Segmento</th>
                <th>Visitantes</th>
                <th>Conv. A</th>
                <th>Conv. B</th>
                <th>Lift</th>
                <th>Confiança</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Mobile · iOS',     v: 1240, a: 3.4, b: 4.6, conf: 96 },
                { name: 'Mobile · Android', v: 980,  a: 3.1, b: 4.2, conf: 91 },
                { name: 'Desktop',          v: 627,  a: 2.8, b: 3.0, conf: 42 },
                { name: 'Vindas de Insta',  v: 1402, a: 2.9, b: 4.4, conf: 97 },
                { name: 'Vindas de Google', v: 720,  a: 3.6, b: 3.8, conf: 38 },
                { name: 'Recorrentes',      v: 412,  a: 5.2, b: 5.1, conf: 12 },
              ].map(s => {
                const lift = ((s.b - s.a) / s.a) * 100;
                return (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td className="mono" style={{ color: 'var(--fg-secondary)' }}>{s.v.toLocaleString('pt-BR')}</td>
                    <td className="mono">{s.a.toFixed(1)}%</td>
                    <td className="mono">{s.b.toFixed(1)}%</td>
                    <td className={`mono ${lift > 0 ? 'lift-pos' : 'lift-neg'}`}>{lift > 0 ? '+' : ''}{lift.toFixed(1)}%</td>
                    <td>
                      <span className={`ab-conf-pill ${s.conf >= 95 ? 'high' : s.conf >= 85 ? 'mid' : 'low'}`}>
                        <span className="conf-bar"><span style={{ width: `${s.conf}%` }}/></span>
                        <span className="mono">{s.conf}%</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="ab-segments-foot">
            <strong>IA detectou:</strong> B ganha forte em mobile e tráfego do Insta (≥ 95%), mas é empate em desktop e clientes recorrentes. Considere rollout gradual: ativar B só pra mobile primeiro, observar 7 dias, depois expandir.
          </div>
        </div>
      </div>

      {/* Bottom: AI cautions */}
      <div className="ab-cautions">
        <h4>Cuidados antes de declarar vencedor</h4>
        <ul>
          <li>
            <span className="caution-glyph ok">✓</span>
            <div>
              <strong>Tamanho de amostra suficiente</strong>
              <span>n = {e.visitors.toLocaleString('pt-BR')} é {e.visitors > 1000 ? 'adequado' : 'baixo'} pra detectar lift de {Math.abs(e.lift).toFixed(1)}%.</span>
            </div>
          </li>
          <li>
            <span className="caution-glyph ok">✓</span>
            <div>
              <strong>Sem viés de novidade detectado</strong>
              <span>Conversão de B se mantém estável a partir do dia 4 (não é só efeito de "novo").</span>
            </div>
          </li>
          <li>
            <span className="caution-glyph warn">⚠</span>
            <div>
              <strong>Período curto pra capturar sazonalidade</strong>
              <span>9 dias não cobrem ciclo completo de pagamento (5 e 10 do mês). Resultado pode mudar em meses futuros.</span>
            </div>
          </li>
          <li>
            <span className="caution-glyph info">ⓘ</span>
            <div>
              <strong>Múltiplos testes simultâneos</strong>
              <span>EXP-017 e EXP-018 estão rodando juntos. Aplicamos correção de Bonferroni — confiança reportada já está ajustada.</span>
            </div>
          </li>
        </ul>
      </div>
    </main>
  );
}

// ─── Confidence gauge (semicircle) ────────────────────────────────────────
function ABConfidenceGauge({ value }) {
  const r = 70;
  const c = Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 95 ? '#0F8A4E' : value >= 85 ? '#C97A0F' : '#B91C1C';
  return (
    <div className="ab-gauge">
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#E7E5E0" strokeWidth="10" strokeLinecap="round"/>
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}/>
        {/* 95% threshold marker */}
        <line x1="153" y1="56" x2="158" y2="50" stroke="#0F8A4E" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div className="ab-gauge-center">
        <div className="ab-gauge-value mono" style={{ color }}>{value.toFixed(1)}%</div>
        <div className="ab-gauge-label">de confiança</div>
      </div>
    </div>
  );
}

// ─── Daily chart (simple SVG) ─────────────────────────────────────────────
function ABDailyChart({ days }) {
  const w = 600, h = 180, pad = 28;
  const max = Math.max(...days.flatMap(d => [d.a, d.b])) * 1.1;
  const x = i => pad + (i / Math.max(days.length - 1, 1)) * (w - pad * 2);
  const y = v => h - pad - (v / max) * (h - pad * 2);
  const lineA = days.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.a)}`).join(' ');
  const lineB = days.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.b)}`).join(' ');

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="ab-chart">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(g => (
        <line key={g} x1={pad} x2={w - pad} y1={pad + g * (h - pad * 2)} y2={pad + g * (h - pad * 2)} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4"/>
      ))}
      {/* Lines */}
      <path d={lineA} fill="none" stroke="#9CA3AF" strokeWidth="2"/>
      <path d={lineB} fill="none" stroke="#00553D" strokeWidth="2"/>
      {/* Dots */}
      {days.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.a)} r="3" fill="#9CA3AF"/>
          <circle cx={x(i)} cy={y(d.b)} r="3" fill="#00553D"/>
        </g>
      ))}
      {/* X labels */}
      {days.map((d, i) => (
        i % 2 === 0 ? <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--fg-secondary)" fontFamily="JetBrains Mono, monospace">d{i + 1}</text> : null
      ))}
    </svg>
  );
}

function ABEditor() {
  const [view, setView] = useStateAB('list');
  const [openId, setOpenId] = useStateAB(null);

  if (view === 'detail' && openId) {
    return <ABDetail id={openId} onBack={() => { setView('list'); setOpenId(null); }}/>;
  }
  return <ABList onOpen={(id) => { setOpenId(id); setView('detail'); }}/>;
}

window.ABEditor = ABEditor;
