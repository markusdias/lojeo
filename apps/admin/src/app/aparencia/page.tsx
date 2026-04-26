'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { InfoTooltip } from '../../components/ui/info-tooltip';

interface AppearanceConfig {
  typo?: string;
  accent?: string;
  bgTone?: string;
  imgRadius?: '0' | '8' | '16';
  typeScale?: 'default' | 'larger' | 'smaller';
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
    palette: ['#B08D4C', '#1A1A1A', '#9AA0A6', '#F5EFE3'],
    status: 'active',
    thumbBg: 'linear-gradient(135deg, #F5EFE3 0%, #E8DDC9 100%)',
    thumbAccent: '#B08D4C',
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
    palette: ['#6F4423', '#3E2A1F', '#A87C5F', '#F4EAD8'],
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
    palette: ['#000000', '#E2243B', '#F2C2D0'],
    status: 'available',
    thumbBg: 'linear-gradient(135deg, #B5343F 0%, #6F1F26 100%)',
    thumbAccent: '#E2243B',
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
    palette: ['#D8B5A2', '#7C5847', '#F5E6DC'],
    status: 'available',
    thumbBg: 'linear-gradient(135deg, #E5C9B5 0%, #C8A28C 100%)',
    thumbAccent: '#7C5847',
  },
];

const TYPO_OPTIONS = [
  { value: 'a', label: 'Clássica refinada', detail: 'Cormorant + Inter' },
  { value: 'b', label: 'Moderna alto-contraste', detail: 'Tenor Sans + Inter' },
  { value: 'c', label: 'Minimalista mensageira', detail: 'Inter + JetBrains Mono' },
];

export default function AparenciaPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('typo');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => setError('Falha ao carregar'));
  }, []);

  if (!settings) return <div style={{ padding: 'var(--space-8)' }}><p className="body-s">Carregando…</p></div>;

  const activeTemplate = TEMPLATES.find(t => t.id === settings.templateId) ?? TEMPLATES[0]!;

  const appearance = settings.config.appearance ?? {};
  const typo = appearance.typo ?? 'a';

  function setAppearance(patch: Partial<AppearanceConfig>) {
    setSettings(prev => prev ? {
      ...prev,
      config: { ...prev.config, appearance: { ...prev.config.appearance, ...patch } },
    } : prev);
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
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError('Erro ao salvar');
    }
  }

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
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
            {/* Hint card "Configurações expostas pelo template" */}
            <div className="lj-card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
              <p className="body-s">
                Configurações expostas pelo template <span className="lj-badge lj-badge-accent">jewelry-v1</span>. Outros templates oferecem opções diferentes.
              </p>
            </div>

            {/* Combinação tipográfica section */}
            <ConfigSection
              title="Combinação tipográfica"
              open={openSection === 'typo'}
              onToggle={() => setOpenSection(openSection === 'typo' ? null : 'typo')}
            >
              <div className="space-y-3">
                {TYPO_OPTIONS.map(o => {
                  const active = typo === o.value;
                  const fontFamily = o.value === 'a' ? "'Cormorant Garamond', Georgia, serif" :
                                     o.value === 'b' ? "'Tenor Sans', Georgia, serif" :
                                     "'Inter', sans-serif";
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setAppearance({ typo: o.value })}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        background: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                        cursor: 'pointer',
                      }}
                    >
                      <p style={{ fontFamily, fontSize: 28, lineHeight: 1.1, marginBottom: 4, color: 'var(--fg)' }}>
                        Atelier Verde
                      </p>
                      <p className="caption" style={{ marginBottom: 4, fontWeight: 'var(--w-medium)', color: active ? 'var(--accent)' : 'var(--fg-secondary)' }}>
                        {o.value.toUpperCase()} · {o.label}
                      </p>
                      <p className="caption mono">{o.detail}</p>
                    </button>
                  );
                })}
              </div>
            </ConfigSection>

            <ConfigSection
              title="Cor de destaque"
              open={openSection === 'accent'}
              onToggle={() => setOpenSection(openSection === 'accent' ? null : 'accent')}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {[
                  { v: 'champagne', l: 'Champagne', s: '#B8956A' },
                  { v: 'silver', l: 'Prata', s: '#9AA0A6' },
                  { v: 'rose-gold', l: 'Ouro Rosê', s: '#C8A28C' },
                  { v: 'copper', l: 'Cobre', s: '#A96B3F' },
                  { v: 'noir-rose', l: 'Noir Rosê', s: '#5C3A3F' },
                ].map(c => {
                  const active = (appearance.accent ?? 'champagne') === c.v;
                  return (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => setAppearance({ accent: c.v })}
                      title={c.l}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: '6px 10px 6px 6px',
                        borderRadius: 'var(--radius-full)',
                        border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        background: 'var(--bg-elevated)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-caption)',
                        fontWeight: 'var(--w-medium)',
                        color: active ? 'var(--accent)' : 'var(--fg-secondary)',
                      }}
                    >
                      <span aria-hidden style={{ width: 16, height: 16, borderRadius: '50%', background: c.s, boxShadow: '0 0 0 1px var(--border)' }} />
                      {c.l}
                    </button>
                  );
                })}
              </div>
            </ConfigSection>

            <ConfigSection
              title="Brand Guide pra IA"
              open={openSection === 'brand'}
              onToggle={() => setOpenSection(openSection === 'brand' ? null : 'brand')}
            >
              <p className="body-s" style={{ marginBottom: 'var(--space-3)' }}>
                Tom de voz, valores, palavras a usar/evitar. A IA referencia este texto pra gerar copy on-brand.
              </p>
              <textarea
                value={settings.config.brandGuide ?? ''}
                onChange={e => setSettings(prev => prev ? {
                  ...prev, config: { ...prev.config, brandGuide: e.target.value },
                } : prev)}
                rows={6}
                className="lj-input"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="Ex: Tom poético, sensorial. Evitar 'compre agora' — preferir 'leve para casa'…"
              />
            </ConfigSection>
          </div>

          {/* Coluna direita — Preview LIVE */}
          <aside style={{ position: 'sticky', top: 'var(--space-4)' }}>
            <div className="lj-card" style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
              }}>
                <p className="caption">
                  PREVIEW LIVE · <span className="mono">{activeTemplate.short}</span> · <span className="mono">atelierve.de</span>
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  {(['desktop', 'tablet', 'mobile'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPreviewMode(m)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: previewMode === m ? 'var(--neutral-900)' : 'transparent',
                        color: previewMode === m ? 'var(--surface)' : 'var(--fg-secondary)',
                        fontSize: 'var(--text-caption)',
                        fontWeight: 'var(--w-medium)',
                        border: 'none',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {m === 'desktop' ? 'Desktop' : m === 'tablet' ? 'Tablet' : 'Mobile'}
                    </button>
                  ))}
                  <Link
                    href="https://apps-lojeo-storefront.m9axtw.easypanel.host"
                    target="_blank"
                    rel="noopener"
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--fg)',
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--w-medium)',
                      border: '1px solid var(--border-strong)',
                      textDecoration: 'none',
                      marginLeft: 'var(--space-1)',
                    }}
                  >
                    Abrir loja ↗
                  </Link>
                </div>
              </div>
              <div style={{
                background: activeTemplate.thumbBg,
                aspectRatio: previewMode === 'mobile' ? '9/16' : previewMode === 'tablet' ? '4/3' : '16/10',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <iframe
                  src="https://apps-lojeo-storefront.m9axtw.easypanel.host"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  title="Storefront preview"
                  loading="lazy"
                />
              </div>
            </div>
          </aside>
        </div>

        {/* Save bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-4)', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--bg-elevated)', boxShadow: '0 -4px 12px rgba(0,0,0,0.04)' }}>
          <div>
            {saved && <span className="body-s" style={{ color: 'var(--success)' }}>✓ Configurações salvas</span>}
            {error && <span className="body-s" style={{ color: 'var(--error)' }}>{error}</span>}
          </div>
          <button type="submit" disabled={saving} className="lj-btn-primary">
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {showSwitcher && <TemplateSwitcherModal templates={TEMPLATES} activeId={activeTemplate.id} onClose={() => setShowSwitcher(false)} onApply={() => setShowSwitcher(false)} />}
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
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="lj-card"
        style={{
          maxWidth: 800,
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
