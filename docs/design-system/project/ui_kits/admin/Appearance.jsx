// Appearance.jsx — Tela "Aparência" do admin lojeo
// Multi-tenant: lojista escolhe template + customiza dentro dos limites do template.
// Camada visual CRUCIAL: chrome do admin é verde-lojeo/Inter; preview é jewelry-v1 (dourado/serif).

const { useState: useStateA } = React;

// ─── Templates disponíveis ──────────────────────────────────────
const TEMPLATES = [
  {
    id: 'jewelry-v1',
    name: 'Joalheria contemporânea',
    version: 'jewelry-v1',
    short: 'Para joias e acessórios premium. Tipografia serif, espaços negativos, foco em produto.',
    palette: ['#C8A24B', '#1A1A1A', '#F8F5EE'],
    type: 'Cormorant + Inter',
    bestFor: 'joia, relógio, acessórios premium',
  },
  {
    id: 'coffee-v1',
    name: 'Café & especialidades',
    version: 'coffee-v1',
    short: 'Para cafés, alimentos artesanais. Tipografia humanista, cores terrosas, storytelling.',
    palette: ['#7A4F2A', '#E8DCC4', '#1F1B16'],
    type: 'Lora + Manrope',
    bestFor: 'café, alimentos, produtos artesanais',
  },
  {
    id: 'fashion-v1',
    name: 'Moda autoral',
    version: 'fashion-v1',
    short: 'Editorial, alto-contraste. Para marcas de moda com identidade forte.',
    palette: ['#0A0A0A', '#FFFFFF', '#E8443A'],
    type: 'Editorial Old + Söhne',
    bestFor: 'moda, vestuário autoral',
  },
  {
    id: 'beauty-v1',
    name: 'Beleza & bem-estar',
    version: 'beauty-v1',
    short: 'Suave, nude, cuidadoso. Para cosméticos naturais e bem-estar.',
    palette: ['#D4B5A0', '#FFF4EC', '#5C3A2E'],
    type: 'Tenor Sans + DM Sans',
    bestFor: 'cosméticos, skincare, bem-estar',
  },
];

// ─── Storefront preview (jewelry-v1 mock) ────────────────────────
function StorefrontPreview({ config }) {
  const tones = {
    'cream-warm': '#F6EFE3',
    'pure-white': '#FFFFFF',
    'cream-cool': '#F4F4EE',
    'off-white': '#FAF7F0',
  };
  const bg = tones[config.bgTone] || '#F6EFE3';
  const radii = { '0': '0', '8': '8px', '16': '16px' };
  const radius = radii[config.imgRadius] || '8px';
  const accent = config.accent || '#C8A24B';

  const typeFamilies = {
    A: { display: '"Cormorant Garamond", "Cormorant", Georgia, serif', body: 'Inter, system-ui, sans-serif', size: 1 },
    B: { display: '"Tenor Sans", "Inter", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', size: 1.05, weight: 400 },
    C: { display: '"JetBrains Mono", monospace', body: '"JetBrains Mono", monospace', size: 0.9, weight: 400 },
  };
  const t = typeFamilies[config.typeCombo] || typeFamilies.A;

  return (
    <div className="sf-preview" style={{ background: bg, fontFamily: t.body }}>
      {/* Storefront top nav */}
      <div className="sf-nav">
        <div className="sf-logo" style={{ fontFamily: t.display, fontSize: 22 * t.size, fontWeight: 500, letterSpacing: '0.16em' }}>
          ATELIER VERDE
        </div>
        <div className="sf-nav-links">
          <span>Coleções</span>
          <span>Anéis</span>
          <span>Brincos</span>
          <span>Sobre</span>
        </div>
        <div className="sf-nav-icons">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
      </div>

      {/* Hero */}
      {(config.hero === 'image' || config.hero === 'video') && (
        <div className="sf-hero" style={{ borderRadius: radius }}>
          <div className="sf-hero-img" style={{ borderRadius: radius }}>
            <div className="sf-hero-grid"/>
          </div>
          <div className="sf-hero-text">
            <div className="sf-eyebrow" style={{ color: accent, fontFamily: t.body }}>NOVA COLEÇÃO · OUTONO 26</div>
            <h2 style={{ fontFamily: t.display, fontWeight: t.weight || 400 }}>
              Peças que carregam<br/>histórias.
            </h2>
            <p>Joias contemporâneas feitas à mão em São Paulo, com ouro reciclado e gemas de origem rastreável.</p>
            <button style={{ color: accent, borderColor: accent }}>
              Explorar coleção <span style={{ marginLeft: 6 }}>→</span>
            </button>
          </div>
        </div>
      )}
      {config.hero === 'carousel' && (
        <div className="sf-hero-carousel">
          <div className="sf-hero-img" style={{ borderRadius: radius, height: 220 }}><div className="sf-hero-grid"/></div>
          <div className="sf-carousel-dots"><i className="active"/><i/><i/></div>
        </div>
      )}
      {config.hero === 'grid' && (
        <div className="sf-hero-grid-layout">
          {[1, 2, 3].map(i => <div key={i} style={{ borderRadius: radius }} className="sf-hero-img"><div className="sf-hero-grid"/></div>)}
        </div>
      )}

      {/* Section title */}
      <div className="sf-section-title" style={{ fontFamily: t.display, fontWeight: t.weight || 400 }}>
        Mais desejadas
      </div>

      {/* Product grid */}
      <div className="sf-products">
        {[
          { name: 'Anel Solitário Ouro 18k', price: 'R$ 2.490' },
          { name: 'Brinco Pérola Prata 950', price: 'R$ 380' },
          { name: 'Pulseira Veneziana', price: 'R$ 920' },
          { name: 'Colar Elo Cartier', price: 'R$ 1.640' },
        ].map(p => (
          <div key={p.name} className="sf-product">
            <div className="sf-product-img" style={{ borderRadius: radius }}>
              {config.photoStyle === 'isolated' && <div className="sf-product-iso"/>}
              {config.photoStyle === 'lifestyle' && <div className="sf-product-life"/>}
              {config.photoStyle === 'mix' && <div className="sf-product-mix"/>}
            </div>
            <div className="sf-product-name" style={{ fontFamily: t.display }}>{p.name}</div>
            <div className="sf-product-price">{p.price}</div>
          </div>
        ))}
      </div>

      {/* Trust signals */}
      {config.trustSignals && config.trustSignals.length > 0 && (
        <div className="sf-trust">
          {config.trustSignals.includes('shipping') && <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></svg> Frete grátis acima de R$ 500</div>}
          {config.trustSignals.includes('warranty') && <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z"/></svg> Garantia 12 meses</div>}
          {config.trustSignals.includes('returns') && <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12a9 9 0 1 0 9-9M3 4v5h5"/></svg> Troca em 30 dias</div>}
          {config.trustSignals.includes('payment') && <div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> Pix, cartão até 12×</div>}
        </div>
      )}
    </div>
  );
}

// ─── Painel de configuração ──────────────────────────────────
function Appearance() {
  const [activeTemplate, setActiveTemplate] = useStateA('jewelry-v1');
  const [showTemplateModal, setShowTemplateModal] = useStateA(false);
  const [openSection, setOpenSection] = useStateA('type');
  const [config, setConfig] = useStateA({
    typeCombo: 'A',
    accent: '#C8A24B',
    bgTone: 'cream-warm',
    photoStyle: 'isolated',
    imgRadius: '8',
    hero: 'image',
    sections: ['hero', 'collections', 'new', 'about', 'reviews', 'ugc'],
    trustSignals: ['shipping', 'warranty', 'returns', 'payment'],
    aiTone: 'casual-warm',
    aiPerson: 'voce',
    avoidWords: 'imperdível, oportunidade única, garanta já',
    preferWords: 'autoral, atemporal, feito à mão',
    slogan: 'Joias que carregam histórias.',
    tagline: 'Atelier de joalheria contemporânea em São Paulo.',
  });
  const update = (key, val) => setConfig(c => ({ ...c, [key]: val }));

  const tpl = TEMPLATES.find(t => t.id === activeTemplate);

  return (
    <main className="main appearance-main">
      <div className="page-header">
        <div>
          <h1>Aparência</h1>
          <p className="sub">Template ativo, identidade visual e brand guide pra IA</p>
        </div>
      </div>

      {/* Active template card */}
      <div className="active-template-card">
        <div className="atc-thumb">
          <div className="atc-thumb-mock">
            <div className="atc-thumb-bar"/>
            <div className="atc-thumb-img"/>
            <div className="atc-thumb-grid"><i/><i/><i/></div>
          </div>
        </div>
        <div className="atc-info">
          <div className="atc-eyebrow">TEMPLATE ATIVO</div>
          <div className="atc-name">{tpl.name}</div>
          <div className="atc-version mono">{tpl.version} · v1.4.2</div>
          <p className="atc-desc">{tpl.short}</p>
          <div className="atc-actions">
            <button className="btn primary" onClick={() => setShowTemplateModal(true)}>Trocar template</button>
            <button className="btn secondary">Ver changelog</button>
            <span className="atc-meta">Atualização disponível: <strong>v1.4.3</strong> · <a>changelog</a></span>
          </div>
        </div>
      </div>

      {/* Split view: configs left, live preview right */}
      <div className="appearance-split">
        {/* CONFIG PANEL */}
        <div className="appearance-config">
          <div className="config-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            Configurações expostas pelo template <strong>{tpl.version}</strong>. Outros templates oferecem opções diferentes.
          </div>

          {/* Type combo */}
          <Section open={openSection === 'type'} title="Combinação tipográfica" onToggle={() => setOpenSection(openSection === 'type' ? null : 'type')}>
            <div className="type-options">
              {[
                { id: 'A', label: 'Clássica refinada', sample: 'Cormorant + Inter', display: '"Cormorant Garamond", serif' },
                { id: 'B', label: 'Moderna alto-contraste', sample: 'Tenor Sans + Inter', display: '"Tenor Sans", sans-serif' },
                { id: 'C', label: 'Minimalista monoespaço', sample: 'JetBrains Mono', display: '"JetBrains Mono", monospace' },
              ].map(opt => (
                <label key={opt.id} className={`type-card ${config.typeCombo === opt.id ? 'selected' : ''}`}>
                  <input type="radio" checked={config.typeCombo === opt.id} onChange={() => update('typeCombo', opt.id)}/>
                  <div className="type-display" style={{ fontFamily: opt.display }}>Atelier Verde</div>
                  <div className="type-name">{opt.id} · {opt.label}</div>
                  <div className="type-meta mono">{opt.sample}</div>
                </label>
              ))}
            </div>
          </Section>

          {/* Accent color */}
          <Section open={openSection === 'color'} title="Cor de destaque" onToggle={() => setOpenSection(openSection === 'color' ? null : 'color')}>
            <div className="color-presets">
              {[
                { hex: '#C8A24B', label: 'Dourado fosco' },
                { hex: '#7A4F2A', label: 'Café tostado' },
                { hex: '#1A4D3E', label: 'Verde profundo' },
                { hex: '#9F1239', label: 'Vinho' },
                { hex: '#0A0A0A', label: 'Preto editorial' },
              ].map(c => (
                <button key={c.hex} className={`color-preset ${config.accent === c.hex ? 'selected' : ''}`} onClick={() => update('accent', c.hex)}>
                  <span className="color-swatch" style={{ background: c.hex }}/>
                  <span className="color-label">
                    <strong>{c.label}</strong>
                    <span className="mono">{c.hex}</span>
                  </span>
                </button>
              ))}
              <div className="color-custom">
                <input type="color" value={config.accent} onChange={e => update('accent', e.target.value)}/>
                <span>Custom</span>
                <input className="hex-input mono" value={config.accent.toUpperCase()} onChange={e => update('accent', e.target.value)}/>
              </div>
            </div>
          </Section>

          {/* Background tone */}
          <Section open={openSection === 'bg'} title="Tom do fundo" onToggle={() => setOpenSection(openSection === 'bg' ? null : 'bg')}>
            <div className="bg-options">
              {[
                { id: 'cream-warm', hex: '#F6EFE3', label: 'Off-white quente' },
                { id: 'pure-white', hex: '#FFFFFF', label: 'Branco puro' },
                { id: 'cream-cool', hex: '#F4F4EE', label: 'Off-white frio' },
                { id: 'off-white', hex: '#FAF7F0', label: 'Creme' },
              ].map(b => (
                <button key={b.id} className={`bg-option ${config.bgTone === b.id ? 'selected' : ''}`} onClick={() => update('bgTone', b.id)}>
                  <span className="bg-swatch" style={{ background: b.hex }}/>
                  <span className="bg-label">{b.label}</span>
                  <span className="mono small">{b.hex}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Photo style */}
          <Section open={openSection === 'photo'} title="Estilo fotográfico" onToggle={() => setOpenSection(openSection === 'photo' ? null : 'photo')}>
            <div className="photo-options">
              {[
                { id: 'isolated', label: 'Isolado', desc: 'Fundo neutro, foco no produto' },
                { id: 'lifestyle', label: 'Lifestyle', desc: 'Em uso, ambientado' },
                { id: 'mix', label: 'Mix', desc: 'Alternância — IA decide por produto' },
              ].map(p => (
                <label key={p.id} className={`photo-card ${config.photoStyle === p.id ? 'selected' : ''}`}>
                  <input type="radio" checked={config.photoStyle === p.id} onChange={() => update('photoStyle', p.id)}/>
                  <div className={`photo-mock photo-mock-${p.id}`}/>
                  <div className="photo-name">{p.label}</div>
                  <div className="photo-desc">{p.desc}</div>
                </label>
              ))}
            </div>
          </Section>

          {/* Image radius */}
          <Section open={openSection === 'radius'} title="Cantos das imagens" onToggle={() => setOpenSection(openSection === 'radius' ? null : 'radius')}>
            <div className="radius-options">
              {['0', '8', '16'].map(r => (
                <button key={r} className={`radius-btn ${config.imgRadius === r ? 'selected' : ''}`} onClick={() => update('imgRadius', r)}>
                  <div className="radius-shape" style={{ borderRadius: r + 'px' }}/>
                  <span className="mono">{r}px</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Hero */}
          <Section open={openSection === 'hero'} title="Hero da homepage" onToggle={() => setOpenSection(openSection === 'hero' ? null : 'hero')}>
            <div className="hero-options">
              {[
                { id: 'image', label: 'Imagem', icon: 'image' },
                { id: 'video', label: 'Vídeo', icon: 'video' },
                { id: 'carousel', label: 'Carrossel', icon: 'slides' },
                { id: 'grid', label: 'Grid 3 cols', icon: 'grid' },
              ].map(h => (
                <button key={h.id} className={`hero-btn ${config.hero === h.id ? 'selected' : ''}`} onClick={() => update('hero', h.id)}>
                  <div className={`hero-mini hero-mini-${h.id}`}/>
                  <span>{h.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Sections drag&drop */}
          <Section open={openSection === 'sections'} title="Seções da homepage" onToggle={() => setOpenSection(openSection === 'sections' ? null : 'sections')}>
            <p className="section-hint">Arraste pra reordenar. Toggle pra ocultar/exibir.</p>
            <div className="sections-list">
              {[
                { id: 'hero', label: 'Hero / Capa' },
                { id: 'collections', label: 'Coleções em destaque' },
                { id: 'new', label: 'Produtos novos' },
                { id: 'about', label: 'Sobre / nossa história' },
                { id: 'reviews', label: 'Depoimentos' },
                { id: 'ugc', label: 'UGC · clientes reais' },
                { id: 'blog', label: 'Blog / editorial', off: true },
              ].map((s, i) => (
                <div key={s.id} className={`section-row ${s.off ? 'off' : ''}`}>
                  <span className="drag-handle">⋮⋮</span>
                  <span className="section-num mono">{i + 1}</span>
                  <span className="section-name">{s.label}</span>
                  <span className={`section-toggle ${s.off ? '' : 'on'}`}/>
                </div>
              ))}
            </div>
          </Section>

          {/* Trust signals */}
          <Section open={openSection === 'trust'} title="Trust signals visíveis" onToggle={() => setOpenSection(openSection === 'trust' ? null : 'trust')}>
            <div className="trust-list">
              {[
                { id: 'shipping', label: 'Frete grátis acima de R$ 500' },
                { id: 'warranty', label: 'Garantia 12 meses' },
                { id: 'returns', label: 'Troca em 30 dias' },
                { id: 'payment', label: 'Pix, cartão até 12×' },
                { id: 'secure', label: 'Site seguro · SSL' },
                { id: 'rating', label: 'Avaliação média 4.8★ (1.2k)' },
              ].map(t => {
                const on = config.trustSignals.includes(t.id);
                return (
                  <label key={t.id} className="trust-row">
                    <input type="checkbox" checked={on} onChange={() => {
                      const next = on ? config.trustSignals.filter(x => x !== t.id) : [...config.trustSignals, t.id];
                      update('trustSignals', next);
                    }}/>
                    <span>{t.label}</span>
                  </label>
                );
              })}
            </div>
          </Section>

          {/* Brand guide for AI */}
          <Section open={openSection === 'ai'} title="Brand guide para IA" onToggle={() => setOpenSection(openSection === 'ai' ? null : 'ai')}>
            <p className="section-hint">A IA usa essas regras pra escrever descrições, e-mails, copy de campanha. Quanto mais específico, mais a voz fica reconhecível.</p>

            <label className="field">
              <span className="field-label">Tom de voz</span>
              <select value={config.aiTone} onChange={e => update('aiTone', e.target.value)}>
                <option value="formal">Formal · Você + linguagem polida</option>
                <option value="casual-warm">Casual caloroso · você + emoção controlada</option>
                <option value="poetic">Poético · você + imagens, ritmo</option>
                <option value="direct">Direto · sem rodeio, frases curtas</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Pessoa</span>
              <div className="radio-row">
                {[['voce', 'Você'], ['tu', 'Tu'], ['voces', 'Vocês (plural)'], ['neutro', 'Sem pronome']].map(([id, label]) => (
                  <label key={id} className={`radio-pill ${config.aiPerson === id ? 'selected' : ''}`}>
                    <input type="radio" checked={config.aiPerson === id} onChange={() => update('aiPerson', id)}/>
                    {label}
                  </label>
                ))}
              </div>
            </label>

            <label className="field">
              <span className="field-label">Palavras a preferir <em>(separadas por vírgula)</em></span>
              <textarea rows="2" value={config.preferWords} onChange={e => update('preferWords', e.target.value)}/>
            </label>

            <label className="field">
              <span className="field-label">Palavras a evitar</span>
              <textarea rows="2" value={config.avoidWords} onChange={e => update('avoidWords', e.target.value)}/>
            </label>

            <label className="field">
              <span className="field-label">Slogan curto</span>
              <input type="text" value={config.slogan} onChange={e => update('slogan', e.target.value)}/>
            </label>

            <label className="field">
              <span className="field-label">Tagline / descritor</span>
              <input type="text" value={config.tagline} onChange={e => update('tagline', e.target.value)}/>
            </label>

            <div className="ai-example-card">
              <div className="ai-example-head">
                <span className="ai-example-badge">Exemplo gerado agora com essas regras</span>
                <button className="btn ghost sm">Regerar</button>
              </div>
              <p className="ai-example-text">
                "Anel solitário em ouro 18k reciclado, com diamante de origem rastreável. Peça <strong>autoral</strong>, feita pra durar gerações. Você escolhe a história — a gente garante o brilho."
              </p>
              <div className="ai-example-meta">Haiku · 0,4 ¢ · 87 tokens</div>
            </div>
          </Section>
        </div>

        {/* PREVIEW */}
        <div className="appearance-preview-wrap">
          <div className="preview-toolbar">
            <span className="preview-label">PREVIEW LIVE · jewelry-v1 · ateliever.de</span>
            <div className="preview-devices">
              <button className="active">Desktop</button>
              <button>Tablet</button>
              <button>Mobile</button>
            </div>
            <button className="btn ghost sm">Abrir loja ↗</button>
          </div>
          <div className="preview-frame">
            <StorefrontPreview config={config}/>
          </div>
          <div className="preview-foot mono">
            Mudanças aplicam só depois de <strong>publicar</strong>. Quem visita a loja agora vê a versão anterior.
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="appearance-footer">
        <span className="appearance-footer-status">
          <span className="dot pulsing"/>
          7 alterações não publicadas
        </span>
        <div className="appearance-footer-actions">
          <button className="btn ghost">Descartar</button>
          <button className="btn secondary">Salvar como rascunho</button>
          <button className="btn primary">Publicar mudanças</button>
        </div>
      </div>

      {showTemplateModal && (
        <TemplateModal templates={TEMPLATES} active={activeTemplate} onSelect={(id) => { setActiveTemplate(id); setShowTemplateModal(false); }} onClose={() => setShowTemplateModal(false)}/>
      )}
    </main>
  );
}

function Section({ title, open, onToggle, children }) {
  return (
    <div className={`config-section ${open ? 'open' : ''}`}>
      <button className="config-section-head" onClick={onToggle}>
        <span>{title}</span>
        <span className="chevron">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="config-section-body">{children}</div>}
    </div>
  );
}

function TemplateModal({ templates, active, onSelect, onClose }) {
  return (
    <>
      <div className="modal-backdrop" onClick={onClose}/>
      <div className="modal template-modal">
        <div className="modal-head">
          <div>
            <h3>Trocar template</h3>
            <p>Escolha um template plugável. Suas configurações migram quando compatíveis; opções específicas resetam.</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="template-grid">
            {templates.map(t => (
              <div key={t.id} className={`template-card ${t.id === active ? 'active' : ''}`}>
                <div className="template-thumb" style={{ background: t.palette[2] }}>
                  <div className="template-thumb-bar" style={{ background: t.palette[1] }}/>
                  <div className="template-thumb-img" style={{ background: t.palette[0] }}/>
                  <div className="template-thumb-grid">
                    <i style={{ background: t.palette[0] }}/>
                    <i style={{ background: t.palette[1], opacity: 0.6 }}/>
                    <i style={{ background: t.palette[0], opacity: 0.5 }}/>
                  </div>
                </div>
                <div className="template-info">
                  <div className="template-name">{t.name}</div>
                  <div className="template-version mono">{t.version}</div>
                  <p>{t.short}</p>
                  <div className="template-meta">
                    <span><strong>Tipos:</strong> {t.type}</span>
                    <span><strong>Bom pra:</strong> {t.bestFor}</span>
                  </div>
                  <div className="template-palette">
                    {t.palette.map(c => <span key={c} style={{ background: c }} className="palette-chip"/>)}
                  </div>
                  {t.id === active ? (
                    <button className="btn secondary disabled" disabled>Template ativo</button>
                  ) : (
                    <button className="btn primary" onClick={() => onSelect(t.id)}>Aplicar template</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

window.Appearance = Appearance;
