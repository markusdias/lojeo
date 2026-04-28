'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { StorefrontPreview } from './storefront-preview';

interface AppearanceConfig {
  typo?: string;
  accent?: string;
  bgTone?: string;
  imgRadius?: '0' | '8' | '16';
  photoStyle?: 'isolated' | 'lifestyle' | 'mix';
  hero?: 'image' | 'video' | 'carousel' | 'grid';
  trustSignals?: string[];
  aiTone?: string;
  aiPerson?: string;
  preferWords?: string;
  avoidWords?: string;
  slogan?: string;
  tagline?: string;
}

interface TenantSettings {
  name: string;
  templateId: string;
  config: { appearance?: AppearanceConfig; brandGuide?: string };
  domain?: string | null;
}

interface TemplateMeta {
  id: string;
  name: string;
  short: string;
  version: string;
  description: string;
  bullets: { label: string; value: string }[];
  palette: string[];
  status: 'active' | 'available';
  thumbBg: string;
  thumbAccent: string;
}

const TEMPLATES: TemplateMeta[] = [
  {
    id: 'jewelry-v1',
    name: 'Joalheria contemporânea',
    short: 'jewelry-v1',
    version: 'v1.4.2',
    description: 'Para joias e acessórios premium. Tipografia serif, espaços negativos, foco em produto.',
    bullets: [
      { label: 'Tipos', value: 'Cormorant + Inter' },
      { label: 'Bom pra', value: 'joia, relógio, acessórios premium' },
    ],
    palette: ['#C8A24B', '#1A1A1A', '#F8F5EE'],
    status: 'active',
    thumbBg: 'linear-gradient(135deg, #F5EFE3 0%, #E8DDC9 100%)',
    thumbAccent: '#C8A24B',
  },
  {
    id: 'coffee-v1',
    name: 'Café & especialidades',
    short: 'coffee-v1',
    version: 'v1.0.0',
    description: 'Para cafés, alimentos artesanais. Tipografia humanista, cores terrosas, storytelling.',
    bullets: [
      { label: 'Tipos', value: 'Lora + Manrope' },
      { label: 'Bom pra', value: 'café, alimentos, produtos artesanais' },
    ],
    palette: ['#7A4F2A', '#E8DCC4', '#1F1B16'],
    status: 'available',
    thumbBg: 'linear-gradient(135deg, #6F4423 0%, #3E2A1F 100%)',
    thumbAccent: '#A87C5F',
  },
  {
    id: 'fashion-v1',
    name: 'Moda autoral',
    short: 'fashion-v1',
    version: 'v1.0.0-beta',
    description: 'Editorial, alto-contraste. Para marcas de moda com identidade forte.',
    bullets: [
      { label: 'Tipos', value: 'Editorial Old + Söhne' },
      { label: 'Bom pra', value: 'moda, vestuário autoral' },
    ],
    palette: ['#0A0A0A', '#FFFFFF', '#E8443A'],
    status: 'available',
    thumbBg: 'linear-gradient(135deg, #B5343F 0%, #6F1F26 100%)',
    thumbAccent: '#E8443A',
  },
  {
    id: 'beauty-v1',
    name: 'Beleza & bem-estar',
    short: 'beauty-v1',
    version: 'v1.0.0-beta',
    description: 'Suave, nude, cuidadoso. Para cosméticos naturais e bem-estar.',
    bullets: [
      { label: 'Tipos', value: 'Tenor Sans + DM Sans' },
      { label: 'Bom pra', value: 'cosméticos, skincare, bem-estar' },
    ],
    palette: ['#D4B5A0', '#FFF4EC', '#5C3A2E'],
    status: 'available',
    thumbBg: 'linear-gradient(135deg, #E5C9B5 0%, #C8A28C 100%)',
    thumbAccent: '#7C5847',
  },
];

const TYPO_OPTIONS = [
  { value: 'a', label: 'Clássica refinada', detail: 'Cormorant + Inter', font: "'Cormorant Garamond', Georgia, serif" },
  { value: 'b', label: 'Moderna alto-contraste', detail: 'Tenor Sans + Inter', font: "'Tenor Sans', Georgia, serif" },
  { value: 'c', label: 'Minimalista monoespaço', detail: 'JetBrains Mono', font: "'JetBrains Mono', ui-monospace, monospace" },
];

const ACCENT_PRESETS = [
  { v: 'gold-matte', l: 'Dourado fosco', s: '#C8A24B' },
  { v: 'roasted-coffee', l: 'Café tostado', s: '#7A4F2A' },
  { v: 'deep-green', l: 'Verde profundo', s: '#1A4D3E' },
  { v: 'wine', l: 'Vinho', s: '#9F1239' },
  { v: 'editorial-black', l: 'Preto editorial', s: '#0A0A0A' },
];

const BG_TONES = [
  { id: 'cream-warm', hex: '#F6EFE3', label: 'Off-white quente' },
  { id: 'pure-white', hex: '#FFFFFF', label: 'Branco puro' },
  { id: 'cream-cool', hex: '#F4F4EE', label: 'Off-white frio' },
  { id: 'off-white', hex: '#FAF7F0', label: 'Creme' },
];

const PHOTO_STYLES = [
  { id: 'isolated', label: 'Isolado', desc: 'Fundo neutro, foco no produto' },
  { id: 'lifestyle', label: 'Lifestyle', desc: 'Em uso, ambientado' },
  { id: 'mix', label: 'Mix', desc: 'Alternância — IA decide por produto' },
];

const HERO_OPTIONS = [
  { id: 'image', label: 'Imagem' },
  { id: 'video', label: 'Vídeo' },
  { id: 'carousel', label: 'Carrossel' },
  { id: 'grid', label: 'Grid 3 cols' },
];

const HOMEPAGE_SECTIONS = [
  { id: 'hero', label: 'Hero / Capa', off: false },
  { id: 'collections', label: 'Coleções em destaque', off: false },
  { id: 'new', label: 'Produtos novos', off: false },
  { id: 'about', label: 'Sobre / nossa história', off: false },
  { id: 'reviews', label: 'Depoimentos', off: false },
  { id: 'ugc', label: 'UGC · clientes reais', off: false },
  { id: 'blog', label: 'Blog / editorial', off: true },
];

const TRUST_SIGNALS = [
  { id: 'shipping', label: 'Frete grátis acima de R$ 500' },
  { id: 'warranty', label: 'Garantia 12 meses' },
  { id: 'returns', label: 'Troca em 30 dias' },
  { id: 'payment', label: 'Pix, cartão até 12×' },
  { id: 'secure', label: 'Site seguro · SSL' },
  { id: 'rating', label: 'Avaliação média 4.8★ (1.2k)' },
];

const AI_TONES = [
  { v: 'formal', l: 'Formal · Você + linguagem polida' },
  { v: 'casual-warm', l: 'Casual caloroso · você + emoção controlada' },
  { v: 'poetic', l: 'Poético · você + imagens, ritmo' },
  { v: 'direct', l: 'Direto · sem rodeio, frases curtas' },
];

const AI_PERSONS: [string, string][] = [
  ['voce', 'Você'],
  ['tu', 'Tu'],
  ['voces', 'Vocês (plural)'],
  ['neutro', 'Sem pronome'],
];

export default function AparenciaPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('typo');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [dirty, setDirty] = useState(0);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => setError('Falha ao carregar'));
  }, []);

  if (!settings) return <div style={{ padding: 'var(--space-8)' }}><p className="body-s">Carregando…</p></div>;

  const activeTemplate = TEMPLATES.find(t => t.id === settings.templateId) ?? TEMPLATES[0]!;
  const appearance = settings.config.appearance ?? {};
  const typo = appearance.typo ?? 'a';
  const accent = appearance.accent ?? 'gold-matte';
  const bgTone = appearance.bgTone ?? 'cream-warm';
  const photoStyle = appearance.photoStyle ?? 'isolated';
  const imgRadius = appearance.imgRadius ?? '8';
  const hero = appearance.hero ?? 'image';
  const trustSignals = appearance.trustSignals ?? ['shipping', 'warranty', 'returns', 'payment'];
  const aiTone = appearance.aiTone ?? 'casual-warm';
  const aiPerson = appearance.aiPerson ?? 'voce';
  const preferWords = appearance.preferWords ?? 'autoral, atemporal, feito à mão';
  const avoidWords = appearance.avoidWords ?? 'imperdível, oportunidade única, garanta já';
  const slogan = appearance.slogan ?? 'Joias que carregam histórias.';
  const tagline = appearance.tagline ?? 'Atelier de joalheria contemporânea em São Paulo.';

  function setAppearance(patch: Partial<AppearanceConfig>) {
    setSettings(prev => prev ? {
      ...prev,
      config: { ...prev.config, appearance: { ...prev.config.appearance, ...patch } },
    } : prev);
    setDirty(d => d + 1);
  }

  function toggleTrust(id: string) {
    const next = trustSignals.includes(id) ? trustSignals.filter(x => x !== id) : [...trustSignals, id];
    setAppearance({ trustSignals: next });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: settings.name, config: settings.config }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setDirty(0);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError('Erro ao salvar');
    }
  }

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) 96px', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>
          Aparência
        </h1>
        <p className="body-s">Template ativo, identidade visual e brand guide pra IA</p>
      </header>

      {/* Card TEMPLATE ATIVO */}
      <section className="lj-card" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-5)', alignItems: 'stretch' }}>
        <TemplateThumb template={activeTemplate} size={150} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <p className="lj-ai-eyebrow" style={{ color: 'var(--fg-secondary)', marginBottom: 'var(--space-2)' }}>TEMPLATE ATIVO</p>
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-1)' }}>{activeTemplate.name}</h2>
          <p className="caption mono" style={{ marginBottom: 'var(--space-3)' }}>{activeTemplate.short} · {activeTemplate.version}</p>
          <p className="body-s" style={{ marginBottom: 'var(--space-4)', flex: 1 }}>
            {activeTemplate.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" onClick={() => setShowSwitcher(true)} className="lj-btn-primary">
                Trocar template
              </button>
              <button type="button" className="lj-btn-secondary">Ver changelog</button>
            </div>
            <p className="caption">Atualização disponível: <strong>v1.4.3</strong> · <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}>changelog</a></p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
          {/* Coluna esquerda — config sections */}
          <div className="space-y-4">
            {/* Hint banner: Configurações expostas pelo template */}
            <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--text-caption)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <span>Configurações expostas pelo template <strong>{activeTemplate.short}</strong>. Outros templates oferecem opções diferentes.</span>
            </div>

            {/* Combinação tipográfica */}
            <ConfigSection title="Combinação tipográfica" open={openSection === 'typo'} onToggle={() => setOpenSection(openSection === 'typo' ? null : 'typo')}>
              <div className="space-y-3">
                {TYPO_OPTIONS.map(o => {
                  const active = typo === o.value;
                  return (
                    <button key={o.value} type="button" onClick={() => setAppearance({ typo: o.value })}
                      style={{ width: '100%', textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-soft)' : 'var(--bg-elevated)', cursor: 'pointer' }}>
                      <p style={{ fontFamily: o.font, fontSize: 28, lineHeight: 1.1, marginBottom: 4, color: 'var(--fg)' }}>Atelier Verde</p>
                      <p className="caption" style={{ marginBottom: 4, fontWeight: 'var(--w-medium)', color: active ? 'var(--accent)' : 'var(--fg-secondary)' }}>{o.value.toUpperCase()} · {o.label}</p>
                      <p className="caption mono">{o.detail}</p>
                    </button>
                  );
                })}
              </div>
            </ConfigSection>

            {/* Cor de destaque */}
            <ConfigSection title="Cor de destaque" open={openSection === 'accent'} onToggle={() => setOpenSection(openSection === 'accent' ? null : 'accent')}>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {ACCENT_PRESETS.map(c => {
                  const active = accent === c.v;
                  return (
                    <button key={c.v} type="button" onClick={() => setAppearance({ accent: c.v })}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                      <span aria-hidden style={{ width: 28, height: 28, borderRadius: 6, background: c.s, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)', flexShrink: 0 }} />
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                        <strong style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{c.l}</strong>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.s.toUpperCase()}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </ConfigSection>

            {/* Tom do fundo */}
            <ConfigSection title="Tom do fundo" open={openSection === 'bg'} onToggle={() => setOpenSection(openSection === 'bg' ? null : 'bg')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                {BG_TONES.map(b => {
                  const active = bgTone === b.id;
                  return (
                    <button key={b.id} type="button" onClick={() => setAppearance({ bgTone: b.id })}
                      style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: active ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                      <span aria-hidden style={{ width: '100%', height: 32, borderRadius: 4, background: b.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{b.label}</span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{b.hex}</span>
                    </button>
                  );
                })}
              </div>
            </ConfigSection>

            {/* Estilo fotográfico */}
            <ConfigSection title="Estilo fotográfico" open={openSection === 'photo'} onToggle={() => setOpenSection(openSection === 'photo' ? null : 'photo')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                {PHOTO_STYLES.map(p => {
                  const active = photoStyle === p.id;
                  const mockBg = p.id === 'isolated' ? 'radial-gradient(circle at center, #C8A24B 30%, #E8DCC4 30%)'
                    : p.id === 'lifestyle' ? 'linear-gradient(180deg, #1A1A1A 30%, #C8A24B 30%, #C8A24B 65%, #5C3A2E 65%)'
                    : 'linear-gradient(90deg, #C8A24B 50%, #5C3A2E 50%)';
                  return (
                    <button key={p.id} type="button" onClick={() => setAppearance({ photoStyle: p.id as 'isolated' | 'lifestyle' | 'mix' })}
                      style={{ padding: 10, border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: active ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
                      <span aria-hidden style={{ display: 'block', height: 56, borderRadius: 4, background: mockBg, marginBottom: 6 }} />
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{p.label}</span>
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', lineHeight: 1.3 }}>{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </ConfigSection>

            {/* Cantos das imagens */}
            <ConfigSection title="Cantos das imagens" open={openSection === 'radius'} onToggle={() => setOpenSection(openSection === 'radius' ? null : 'radius')}>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {(['0', '8', '16'] as const).map(r => {
                  const active = imgRadius === r;
                  return (
                    <button key={r} type="button" onClick={() => setAppearance({ imgRadius: r })}
                      style={{ flex: 1, padding: 12, border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: active ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span aria-hidden style={{ width: 40, height: 28, background: '#C8A24B', borderRadius: r + 'px' }} />
                      <span className="mono" style={{ fontSize: 11 }}>{r}px</span>
                    </button>
                  );
                })}
              </div>
            </ConfigSection>

            {/* Hero da homepage */}
            <ConfigSection title="Hero da homepage" open={openSection === 'hero'} onToggle={() => setOpenSection(openSection === 'hero' ? null : 'hero')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
                {HERO_OPTIONS.map(h => {
                  const active = hero === h.id;
                  const mock = h.id === 'image' ? 'linear-gradient(135deg, #C8A24B, #B8923B)'
                    : h.id === 'video' ? 'linear-gradient(135deg, #1A1A1A, #5C3A2E)'
                    : h.id === 'carousel' ? 'linear-gradient(90deg, #C8A24B 33%, #B8923B 33%, #B8923B 66%, #5C3A2E 66%)'
                    : 'linear-gradient(90deg, #C8A24B 33%, #fff 33%, #fff 34%, #B8923B 34%, #B8923B 66%, #fff 66%, #fff 67%, #5C3A2E 67%)';
                  return (
                    <button key={h.id} type="button" onClick={() => setAppearance({ hero: h.id as 'image' | 'video' | 'carousel' | 'grid' })}
                      style={{ padding: 10, border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: active ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg)' }}>
                      <span aria-hidden style={{ width: '100%', height: 40, background: mock, borderRadius: 4, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                        {h.id === 'video' ? '▶' : ''}
                      </span>
                      <span>{h.label}</span>
                    </button>
                  );
                })}
              </div>
            </ConfigSection>

            {/* Seções da homepage */}
            <ConfigSection title="Seções da homepage" open={openSection === 'sections'} onToggle={() => setOpenSection(openSection === 'sections' ? null : 'sections')}>
              <p className="caption" style={{ marginBottom: 'var(--space-3)' }}>Arraste pra reordenar. Toggle pra ocultar/exibir.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {HOMEPAGE_SECTIONS.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, opacity: s.off ? 0.5 : 1 }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', cursor: 'grab', letterSpacing: -2 }}>⋮⋮</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', width: 14 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--fg)', flex: 1 }}>{s.label}</span>
                    <span aria-hidden style={{ width: 28, height: 16, borderRadius: 999, background: s.off ? 'var(--neutral-200)' : 'var(--accent)', position: 'relative', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 2, left: 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transform: s.off ? 'translateX(0)' : 'translateX(12px)', transition: 'transform 0.15s' }} />
                    </span>
                  </div>
                ))}
              </div>
            </ConfigSection>

            {/* Trust signals */}
            <ConfigSection title="Trust signals visíveis" open={openSection === 'trust'} onToggle={() => setOpenSection(openSection === 'trust' ? null : 'trust')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TRUST_SIGNALS.map(t => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fg)', cursor: 'pointer', padding: '6px 0' }}>
                    <input type="checkbox" checked={trustSignals.includes(t.id)} onChange={() => toggleTrust(t.id)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </ConfigSection>

            {/* Brand guide pra IA */}
            <ConfigSection title="Brand guide pra IA" open={openSection === 'ai'} onToggle={() => setOpenSection(openSection === 'ai' ? null : 'ai')}>
              <p className="caption" style={{ marginBottom: 'var(--space-3)' }}>A IA usa essas regras pra escrever descrições, e-mails, copy de campanha. Quanto mais específico, mais a voz fica reconhecível.</p>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Tom de voz</span>
                <select value={aiTone} onChange={e => setAppearance({ aiTone: e.target.value })} className="lj-input">
                  {AI_TONES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </label>

              <div style={{ marginBottom: 14 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Pessoa</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {AI_PERSONS.map(([id, l]) => {
                    const active = aiPerson === id;
                    return (
                      <button key={id} type="button" onClick={() => setAppearance({ aiPerson: id })}
                        style={{ padding: '6px 12px', border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)', borderRadius: 999, background: active ? 'var(--accent-soft)' : 'var(--bg)', color: active ? 'var(--accent)' : 'var(--fg)', fontSize: 12, cursor: 'pointer' }}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Palavras a preferir <em style={{ fontStyle: 'normal', color: 'var(--fg-muted)' }}>(separadas por vírgula)</em></span>
                <textarea rows={2} value={preferWords} onChange={e => setAppearance({ preferWords: e.target.value })} className="lj-input" style={{ resize: 'vertical', lineHeight: 1.5 }} />
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Palavras a evitar</span>
                <textarea rows={2} value={avoidWords} onChange={e => setAppearance({ avoidWords: e.target.value })} className="lj-input" style={{ resize: 'vertical', lineHeight: 1.5 }} />
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Slogan curto</span>
                <input type="text" value={slogan} onChange={e => setAppearance({ slogan: e.target.value })} className="lj-input" />
              </label>

              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>Tagline / descritor</span>
                <input type="text" value={tagline} onChange={e => setAppearance({ tagline: e.target.value })} className="lj-input" />
              </label>

              <div style={{ marginTop: 16, border: '1px solid var(--accent-soft)', borderLeft: '3px solid var(--accent)', background: 'linear-gradient(180deg, var(--accent-soft), var(--bg) 80%)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>Exemplo gerado agora com essas regras</span>
                  <button type="button" className="lj-btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Regerar</button>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--fg)', fontStyle: 'italic' }}>
                  &ldquo;Anel solitário em ouro 18k reciclado, com diamante de origem rastreável. Peça <strong>autoral</strong>, feita pra durar gerações. Você escolhe a história — a gente garante o brilho.&rdquo;
                </p>
                <div className="mono" style={{ marginTop: 8, fontSize: 10, color: 'var(--fg-muted)' }}>Haiku · 0,4 ¢ · 87 tokens</div>
              </div>
            </ConfigSection>
          </div>

          {/* Coluna direita — Preview LIVE */}
          <aside style={{ position: 'sticky', top: 'var(--space-4)' }}>
            <div className="lj-card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <p className="caption">
                  PREVIEW LIVE · <span className="mono">{activeTemplate.short}</span> · <span className="mono">atelierve.de</span>
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  {(['desktop', 'tablet', 'mobile'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setPreviewMode(m)}
                      style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: previewMode === m ? 'var(--neutral-900)' : 'transparent', color: previewMode === m ? 'var(--surface)' : 'var(--fg-secondary)', fontSize: 'var(--text-caption)', fontWeight: 'var(--w-medium)', border: 'none', cursor: 'pointer', textTransform: 'capitalize' }}>
                      {m === 'desktop' ? 'Desktop' : m === 'tablet' ? 'Tablet' : 'Mobile'}
                    </button>
                  ))}
                  <Link href="https://apps-lojeo-storefront.m9axtw.easypanel.host" target="_blank" rel="noopener"
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', color: 'var(--fg)', fontSize: 'var(--text-caption)', fontWeight: 'var(--w-medium)', border: '1px solid var(--border-strong)', textDecoration: 'none', marginLeft: 'var(--space-1)' }}>
                    Abrir loja ↗
                  </Link>
                </div>
              </div>
              <div
                style={{
                  position: 'relative',
                  overflow: 'auto',
                  background: 'var(--bg-subtle)',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: previewMode === 'desktop' ? 0 : 'var(--space-4)',
                  height: previewMode === 'mobile' ? 720 : previewMode === 'tablet' ? 760 : 540,
                }}
              >
                <div
                  style={{
                    width: previewMode === 'mobile' ? 375 : previewMode === 'tablet' ? 768 : '100%',
                    maxWidth: '100%',
                    background: 'var(--surface)',
                    boxShadow: previewMode === 'desktop' ? 'none' : '0 4px 24px rgba(0,0,0,0.08)',
                    borderRadius: previewMode === 'desktop' ? 0 : 8,
                    overflow: 'auto',
                  }}
                >
                  <StorefrontPreview config={{ typo, accent, bgTone, photoStyle, imgRadius, hero, trustSignals }} />
                </div>
              </div>
              <div className="mono" style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--fg-muted)' }}>
                Mudanças aplicam só depois de <strong>publicar</strong>. Quem visita a loja agora vê a versão anterior.
              </div>
            </div>
          </aside>
        </div>

        {/* Sticky footer — Descartar / Salvar rascunho / Publicar */}
        <div style={{ position: 'fixed', bottom: 0, left: 'var(--sidebar-w)', right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 28px', background: 'var(--surface)', borderTop: '1px solid var(--border)', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', zIndex: 50 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg)' }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: dirty > 0 ? '#F59E0B' : 'var(--success)', boxShadow: dirty > 0 ? '0 0 0 4px rgba(245, 158, 11, 0.15)' : 'none' }} />
            {dirty > 0 ? `${dirty} alteraç${dirty === 1 ? 'ão' : 'ões'} não publicada${dirty === 1 ? '' : 's'}` : (saved ? 'Configurações salvas' : 'Sem alterações pendentes')}
            {error && <span style={{ color: 'var(--error)', marginLeft: 8 }}>{error}</span>}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="lj-btn-secondary" onClick={() => { setSettings(prev => prev ? { ...prev } : prev); setDirty(0); }} disabled={dirty === 0}>Descartar</button>
            <button type="submit" className="lj-btn-secondary" disabled={saving}>Salvar como rascunho</button>
            <button type="submit" className="lj-btn-primary" disabled={saving}>{saving ? 'Publicando…' : 'Publicar mudanças'}</button>
          </div>
        </div>
      </form>

      {showSwitcher && <TemplateSwitcherModal
        templates={TEMPLATES}
        activeId={activeTemplate.id}
        onClose={() => setShowSwitcher(false)}
        onApply={async (id) => {
          const res = await fetch('/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: id }),
          });
          if (res.ok) {
            setSettings(prev => prev ? { ...prev, templateId: id } : prev);
            setShowSwitcher(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          } else {
            const err = await res.json() as { error?: string; message?: string };
            setError(err.message ?? err.error ?? 'Falha ao trocar template');
            setShowSwitcher(false);
            setTimeout(() => setError(''), 5000);
          }
        }}
      />}
    </main>
  );
}

function ConfigSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="lj-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 'var(--text-body)',
          fontWeight: 'var(--w-medium)',
          color: 'var(--fg)',
          textAlign: 'left',
        }}
      >
        {title}
        <span aria-hidden style={{ color: 'var(--fg-muted)', fontSize: 18 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 var(--space-5) var(--space-5)', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 'var(--space-4)' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateThumb({ template, size = 96 }: { template: TemplateMeta; size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        background: template.thumbBg,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px var(--border)',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '15%',
        width: '70%',
        height: '40%',
        background: template.thumbAccent,
        borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: '15%',
        display: 'flex',
        gap: 4,
      }}>
        {template.palette.map((c, i) => (
          <div key={i} style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: c,
          }} />
        ))}
      </div>
    </div>
  );
}

function TemplateSwitcherModal({
  templates,
  activeId,
  onClose,
  onApply,
}: {
  templates: TemplateMeta[];
  activeId: string;
  onClose: () => void;
  onApply: (id: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 10, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="lj-card"
        style={{
          maxWidth: 1100,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 'var(--space-6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>Trocar template</h2>
            <p className="body-s">Escolha um template plugável. Suas configurações migram quando compatíveis; opções específicas resetam.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--fg-muted)' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {templates.map(t => {
            const active = t.id === activeId;
            return (
              <div
                key={t.id}
                className="lj-card"
                style={{
                  padding: 'var(--space-4)',
                  border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <TemplateThumb template={t} size={140} />
                <div>
                  <h3 style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-1)' }}>{t.name}</h3>
                  <p className="caption mono" style={{ marginBottom: 'var(--space-2)' }}>{t.short}</p>
                  <p className="body-s" style={{ marginBottom: 'var(--space-3)' }}>{t.description}</p>
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    {t.bullets.map(b => (
                      <p key={b.label} className="caption" style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 'var(--w-semibold)', color: 'var(--fg)' }}>{b.label}: </span>{b.value}
                      </p>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-3)' }}>
                    {t.palette.map((c, i) => (
                      <span key={i} aria-hidden style={{ width: 14, height: 14, borderRadius: 3, background: c, boxShadow: '0 0 0 1px var(--border)' }} />
                    ))}
                  </div>
                </div>
                {active ? (
                  <button type="button" disabled className="lj-btn-secondary" style={{ width: '100%' }}>
                    Template ativo
                  </button>
                ) : (
                  <button type="button" onClick={() => onApply(t.id)} className="lj-btn-primary" style={{ width: '100%' }}>
                    Aplicar template
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
