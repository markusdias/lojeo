'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { SettingsSidebar, useTabHash } from './sidebar-tabs';
import { GatewaysCards, FreteCards, FiscalCards, EmailCards } from './integration-cards';

interface BrandGuide {
  brandName?: string;
  tonePersonality?: string;
  vocabPreferred?: string; // comma-separated
  vocabAvoid?: string;     // comma-separated
  examples?: string;       // newline-separated
  aiMonthlyLimitCents?: number; // limit in USD cents (0 = unlimited)
}

interface TenantConfig {
  contactEmail?: string;
  freeShippingThresholdCents?: number;
  pixDiscountPercent?: number;
  installmentsMax?: number;
  warrantyMonthsDefault?: number;
  robotsTxt?: string;
  appearance?: {
    typo?: string;        // 'a' | 'b' | 'c'
    accent?: string;      // 'champagne' | 'silver' | 'rose-gold' | 'copper' | 'noir-rose'
    bgTone?: string;      // 'warm' | 'pure' | 'cool' | 'cream'
    imgRadius?: '0' | '8' | '16';
    typeScale?: 'default' | 'larger' | 'smaller';
  };
  pixels?: {
    gaTrackingId?: string;     // G-XXXXXXXXXX
    gtmId?: string;             // GTM-XXXXXX
    metaPixelId?: string;       // 12345...
    tiktokPixelId?: string;     // C12345...
    clarityProjectId?: string;  // ABCDE12345
    googleAdsConversionId?: string; // AW-XXXX
  };
  brandGuide?: BrandGuide;
  // Sprint 8 v2 — limite de requests do IA Analyst por usuário
  aiAnalystRateLimit?: {
    perMinute?: number; // default 10
    perDay?: number;    // default 200
  };
}

interface Settings {
  name: string;
  domain: string | null;
  templateId: string;
  config: TenantConfig;
}

const TYPO_OPTIONS = [
  { value: 'a', label: 'Clássico-Luxo (Cormorant + Inter)' },
  { value: 'b', label: 'Editorial-Moderno (Playfair + Source Sans)' },
  { value: 'c', label: 'Object-Design (Inter + JetBrains Mono)' },
];

const ACCENT_OPTIONS: { value: string; label: string; swatch: string }[] = [
  { value: 'champagne', label: 'Champagne', swatch: '#B8956A' },
  { value: 'silver', label: 'Prata', swatch: '#9AA0A6' },
  { value: 'rose-gold', label: 'Ouro Rosê', swatch: '#C8A28C' },
  { value: 'copper', label: 'Cobre', swatch: '#A96B3F' },
  { value: 'noir-rose', label: 'Noir Rosê', swatch: '#5C3A3F' },
];

const BG_OPTIONS: { value: string; label: string; swatch: string }[] = [
  { value: 'warm', label: 'Warm (padrão)', swatch: '#FAFAF6' },
  { value: 'pure', label: 'Pure (branco)', swatch: '#FFFFFF' },
  { value: 'cool', label: 'Cool', swatch: '#F7F8FA' },
  { value: 'cream', label: 'Cream', swatch: '#F5EFE3' },
];

const IMG_RADIUS_OPTIONS: { value: '0' | '8' | '16'; label: string }[] = [
  { value: '0', label: 'Reto (0px)' },
  { value: '8', label: 'Suave (8px)' },
  { value: '16', label: 'Arredondado (16px)' },
];

const TYPE_SCALE_OPTIONS: { value: 'default' | 'larger' | 'smaller'; label: string }[] = [
  { value: 'smaller', label: 'Compacta' },
  { value: 'default', label: 'Padrão' },
  { value: 'larger', label: 'Espaçosa' },
];

type FontPair = { display: string; body: string };
type ScalePx = { h: string; body: string };

const TYPO_FONT_DEFAULT: FontPair = { display: "'Cormorant Garamond', Georgia, serif", body: "'Inter', system-ui, sans-serif" };
const TYPO_FONTS: Record<string, FontPair> = {
  a: TYPO_FONT_DEFAULT,
  b: { display: "'Playfair Display', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif" },
  c: { display: "'Inter', system-ui, sans-serif", body: "'JetBrains Mono', ui-monospace, monospace" },
};

const TYPE_SCALE_DEFAULT: ScalePx = { h: '24px', body: '15px' };
const TYPE_SCALE_PX: Record<'default' | 'larger' | 'smaller', ScalePx> = {
  smaller: { h: '20px', body: '13px' },
  default: TYPE_SCALE_DEFAULT,
  larger: { h: '28px', body: '17px' },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useTabHash('identidade');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings);
  }, []);

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
      setError('Erro ao salvar. Tente novamente.');
    }
  }

  function setConfig(patch: Partial<TenantConfig>) {
    setSettings(prev => prev ? { ...prev, config: { ...prev.config, ...patch } } : prev);
  }

  function setAppearance(patch: Partial<NonNullable<TenantConfig['appearance']>>) {
    setSettings(prev => prev ? {
      ...prev,
      config: { ...prev.config, appearance: { ...prev.config.appearance, ...patch } }
    } : prev);
  }

  function setBrandGuide(patch: Partial<BrandGuide>) {
    setSettings(prev => prev ? {
      ...prev,
      config: { ...prev.config, brandGuide: { ...prev.config.brandGuide, ...patch } }
    } : prev);
  }

  if (!settings) {
    return <main className="p-8"><p className="text-neutral-500">Carregando…</p></main>;
  }

  const accent = settings.config.appearance?.accent ?? 'champagne';
  const bgTone = settings.config.appearance?.bgTone ?? 'warm';
  const typo = settings.config.appearance?.typo ?? 'a';
  const imgRadius = settings.config.appearance?.imgRadius ?? '8';
  const typeScale = settings.config.appearance?.typeScale ?? 'default';
  const accentSwatch = ACCENT_OPTIONS.find(o => o.value === accent)?.swatch ?? '#B8956A';
  const bgSwatch = BG_OPTIONS.find(o => o.value === bgTone)?.swatch ?? '#FAFAF6';
  const fonts: FontPair = TYPO_FONTS[typo] ?? TYPO_FONT_DEFAULT;
  const scale: ScalePx = TYPE_SCALE_PX[typeScale] ?? TYPE_SCALE_DEFAULT;

  // Tab → conteúdo sub-view (filter sections by active tab)
  const showSection = (tab: typeof activeTab) => activeTab === tab ? {} : { display: 'none' };

  // Cards-only tabs (Vendas/Comunicação) renderizam fora do form
  const isCardsTab = activeTab === 'pagamentos' || activeTab === 'frete' || activeTab === 'fiscal' || activeTab === 'email';

  return (
    <main style={{ padding: 'var(--space-6) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-5)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--space-1)', color: 'var(--fg-muted)' }}>
          Configurações
        </p>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-1)' }}>
          {activeTab === 'identidade' ? 'Identidade da loja'
            : activeTab === 'aparencia' ? 'Aparência'
            : activeTab === 'pagamentos' ? 'Gateways de pagamento'
            : activeTab === 'frete' ? 'Frete e logística'
            : activeTab === 'fiscal' ? 'Fiscal e ERP'
            : activeTab === 'email' ? 'E-mail transacional'
            : activeTab === 'pixels' ? 'Pixels & Analytics'
            : activeTab === 'ia' ? 'IA · cota e brand guide'
            : activeTab === 'comercial' ? 'Políticas comerciais'
            : activeTab === 'robots' ? 'Robots.txt'
            : 'Configurações da loja'
          }
        </h1>
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          {activeTab === 'pagamentos' ? 'Conecte uma ou mais formas de receber. OAuth de 1 clique — sem copiar chaves.'
            : activeTab === 'frete' ? 'Cotação automática e geração de etiquetas — Brasil e exterior.'
            : activeTab === 'fiscal' ? 'Emissão automática de NF-e por pedido + sync de estoque.'
            : activeTab === 'email' ? 'Confirmações de pedido, rastreio, recuperação de carrinho.'
            : 'Tudo que sua loja precisa pra funcionar — em um lugar.'}
        </p>
        <p className="caption" style={{ marginTop: 'var(--space-2)', color: 'var(--fg-muted)' }}>
          Template <code className="mono">{settings.templateId}</code>
          {settings.domain && <> · Domínio <code className="mono">{settings.domain}</code></>}
        </p>
      </header>

      <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        <SettingsSidebar active={activeTab} onChange={setActiveTab} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs cards-only (Vendas/Comunicação): renderizam fora do form */}
          {activeTab === 'pagamentos' && <GatewaysCards />}
          {activeTab === 'frete' && <FreteCards />}
          {activeTab === 'fiscal' && <FiscalCards />}
          {activeTab === 'email' && <EmailCards />}

          {!isCardsTab && (
      <form onSubmit={handleSave} className="space-y-8">
        {/* Identidade */}
        <section id="identidade" className="lj-card" style={{ padding: 'var(--space-6)', ...showSection('identidade') }}>
          <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-4)' }}>Identidade</h2>
          <div className="space-y-4">
            <div>
              <label className="eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Nome da loja</label>
              <input
                type="text"
                value={settings.name}
                onChange={e => setSettings(prev => prev ? { ...prev, name: e.target.value } : prev)}
                className="lj-input"
                style={{ width: '100%' }}
                required
              />
            </div>
            <div>
              <label className="eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Email de contato</label>
              <input
                type="email"
                value={settings.config.contactEmail ?? ''}
                onChange={e => setConfig({ contactEmail: e.target.value })}
                placeholder="contato@sualoja.com.br"
                className="lj-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </section>

        {/* Aparência */}
        <section id="aparencia" className="lj-card" style={{ padding: 'var(--space-6)', ...showSection('aparencia') }}>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-1)' }}>Aparência do storefront</h2>
            <p className="body-s">
              Combine tipografia, cor de destaque, fundo, escala e raio de imagem. As mudanças se aplicam ao storefront após salvar.
            </p>
          </div>

          {/* Tipografia (radio cards) */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              Combinação tipográfica
              <InfoTooltip text="Combinação tipográfica do storefront. Mudança aplica imediatamente sem rebuild." />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              {TYPO_OPTIONS.map(o => {
                const fp = TYPO_FONTS[o.value] ?? TYPO_FONT_DEFAULT;
                const active = typo === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setAppearance({ typo: o.value })}
                    style={{
                      textAlign: 'left',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      border: active ? `1.5px solid var(--accent)` : '1px solid var(--border)',
                      background: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      cursor: 'pointer',
                      transition: 'background var(--dur-fast) var(--ease-out)',
                    }}
                  >
                    <p style={{ fontFamily: fp.display, fontSize: 22, lineHeight: 1.1, marginBottom: 4 }}>Aa</p>
                    <p style={{ fontSize: 'var(--text-caption)', color: active ? 'var(--accent)' : 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>{o.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent color (swatches) */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Cor de destaque</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {ACCENT_OPTIONS.map(o => {
                const active = accent === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setAppearance({ accent: o.value })}
                    title={o.label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: '6px 10px 6px 6px',
                      borderRadius: 'var(--radius-full)',
                      border: active ? `1.5px solid var(--accent)` : '1px solid var(--border)',
                      background: 'var(--bg-elevated)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--w-medium)',
                      color: active ? 'var(--accent)' : 'var(--fg-secondary)',
                    }}
                  >
                    <span aria-hidden style={{ width: 16, height: 16, borderRadius: '50%', background: o.swatch, display: 'inline-block', boxShadow: '0 0 0 1px var(--border)' }} />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BG tone (swatches) */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Tom de fundo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {BG_OPTIONS.map(o => {
                const active = bgTone === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setAppearance({ bgTone: o.value })}
                    title={o.label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: '6px 10px 6px 6px',
                      borderRadius: 'var(--radius-full)',
                      border: active ? `1.5px solid var(--accent)` : '1px solid var(--border)',
                      background: 'var(--bg-elevated)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--w-medium)',
                      color: active ? 'var(--accent)' : 'var(--fg-secondary)',
                    }}
                  >
                    <span aria-hidden style={{ width: 16, height: 16, borderRadius: 4, background: o.swatch, display: 'inline-block', boxShadow: '0 0 0 1px var(--border)' }} />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Img radius (segmented) */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              Raio de imagens
              <InfoTooltip text="Quanto arredondar cantos de imagens de produto. 0 = quadrado, 16 = bem arredondado." />
            </label>
            <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {IMG_RADIUS_OPTIONS.map(o => {
                const active = imgRadius === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setAppearance({ imgRadius: o.value })}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: active ? 'var(--fg-on-accent)' : 'var(--fg)',
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--w-medium)',
                      border: 'none',
                      borderLeft: o.value !== '0' ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type scale (segmented) */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Escala tipográfica</label>
            <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {TYPE_SCALE_OPTIONS.map((o, i) => {
                const active = typeScale === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setAppearance({ typeScale: o.value })}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: active ? 'var(--fg-on-accent)' : 'var(--fg)',
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--w-medium)',
                      border: 'none',
                      borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visualizador inline */}
          <div
            className="mt-2 rounded border border-neutral-200 p-5"
            style={{ background: bgSwatch, color: '#1A1612' }}
          >
            <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Pré-visualização</p>
            <div className="flex items-center gap-4">
              <div
                aria-hidden
                style={{
                  width: 64,
                  height: 64,
                  background: accentSwatch,
                  borderRadius: `${imgRadius}px`,
                  boxShadow: '0 4px 16px rgba(26,22,18,0.06)',
                }}
              />
              <div className="flex-1">
                <h3 style={{ fontFamily: fonts.display, fontSize: scale.h, lineHeight: 1.2, margin: 0, fontWeight: 500 }}>
                  Aliança em ouro 18k
                </h3>
                <p style={{ fontFamily: fonts.body, fontSize: scale.body, lineHeight: 1.5, margin: '6px 0 0', color: '#3A332C' }}>
                  Peça artesanal, certificado de origem.
                </p>
              </div>
              <span
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium"
                style={{
                  background: accentSwatch,
                  color: '#FFFFFF',
                  borderRadius: '999px',
                  fontFamily: fonts.body,
                }}
              >
                Comprar
              </span>
            </div>
            <p className="mt-3 text-[11px] text-neutral-500 font-mono">
              data-typo=&quot;{typo}&quot; · data-accent=&quot;{accent}&quot; · data-bg-tone=&quot;{bgTone}&quot; · data-img-radius=&quot;{imgRadius}&quot; · data-type-scale=&quot;{typeScale}&quot;
            </p>
          </div>
        </section>

        {/* Políticas comerciais */}
        <section id="comercial" className="bg-white rounded-lg shadow p-6 space-y-4" style={showSection('comercial')}>
          <h2 className="font-semibold text-lg">Políticas comerciais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Frete grátis acima de (R$)
                <InfoTooltip text="Acima desse valor (em reais), o cliente não paga frete. Ex: 30000 = R$ 300,00 grátis." />
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={(settings.config.freeShippingThresholdCents ?? 50000) / 100}
                onChange={e => setConfig({ freeShippingThresholdCents: Math.round(parseFloat(e.target.value) * 100) })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Desconto Pix (%)
                <InfoTooltip text="Desconto exibido para clientes que pagam via Pix. Aplicado automaticamente no checkout." />
              </label>
              <input
                type="number"
                min={0}
                max={20}
                step={1}
                value={settings.config.pixDiscountPercent ?? 5}
                onChange={e => setConfig({ pixDiscountPercent: parseFloat(e.target.value) })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Parcelas máximas no cartão
                <InfoTooltip text="Máximo de parcelas sem juros no cartão. Acima disso, juros são cobrados (configurar com Mercado Pago)." />
              </label>
              <input
                type="number"
                min={1}
                max={12}
                step={1}
                value={settings.config.installmentsMax ?? 6}
                onChange={e => setConfig({ installmentsMax: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Garantia padrão (meses)
                <InfoTooltip text="Padrão usado quando produto não tem warrantyMonths próprio. Joalheria típica: 12 meses." />
              </label>
              <input
                type="number"
                min={0}
                max={120}
                step={1}
                value={settings.config.warrantyMonthsDefault ?? 12}
                onChange={e => setConfig({ warrantyMonthsDefault: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* Brand Guide IA */}
        <section id="brand-guide" className="bg-white rounded-lg shadow p-6 space-y-4" style={showSection('ia')}>
          <div>
            <h2 className="font-semibold text-lg">Brand Guide para IA</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Controla o tom e vocabulário quando IA gera descrições e SEO de produtos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nome da marca (usado nos prompts)</label>
              <input
                type="text"
                value={settings.config.brandGuide?.brandName ?? ''}
                onChange={e => setBrandGuide({ brandName: e.target.value })}
                placeholder="Atelier Joias"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Limite mensal IA (USD — 0 = ilimitado)
                <InfoTooltip text="Limite mensal em USD cents (ex: 5000 = $50). 0 = ilimitado. Acima do limite, IA bloqueia automaticamente até virar mês." />
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={(settings.config.brandGuide?.aiMonthlyLimitCents ?? 0) / 100}
                onChange={e => setBrandGuide({ aiMonthlyLimitCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                placeholder="50"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Tom e personalidade</label>
            <textarea
              rows={3}
              value={settings.config.brandGuide?.tonePersonality ?? ''}
              onChange={e => setBrandGuide({ tonePersonality: e.target.value })}
              placeholder="Luxo sem pretensão. Premium mas acessível. Storytelling com fatos de material. Voz ativa. Sem emoji."
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Vocabulário preferido (vírgula)</label>
              <input
                type="text"
                value={settings.config.brandGuide?.vocabPreferred ?? ''}
                onChange={e => setBrandGuide({ vocabPreferred: e.target.value })}
                placeholder="artesanal, certificado, atemporal"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Vocabulário a evitar (vírgula)</label>
              <input
                type="text"
                value={settings.config.brandGuide?.vocabAvoid ?? ''}
                onChange={e => setBrandGuide({ vocabAvoid: e.target.value })}
                placeholder="exclusivo, viral, trending"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Exemplos de copy aprovada (1 por linha)</label>
            <textarea
              rows={4}
              value={settings.config.brandGuide?.examples ?? ''}
              onChange={e => setBrandGuide({ examples: e.target.value })}
              placeholder={'Quartzo rosa garimpado individualmente, cada peça única em sua jornada.\nOuro 18k certificado, com 8 horas de trabalho artesanal por peça.'}
              className="w-full border rounded px-3 py-2 text-sm font-mono text-xs"
            />
            <p className="text-xs text-neutral-400 mt-1">3–5 exemplos de alto desempenho melhoram muito a qualidade da geração.</p>
          </div>

          {/* Rate limit IA Analyst (Sprint 8 v2) */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <h3 className="font-semibold text-sm" style={{ marginBottom: 4 }}>Limites do IA Analyst por usuário</h3>
            <p className="text-xs text-neutral-500" style={{ marginBottom: 'var(--space-3)' }}>
              Controla quantas perguntas cada usuário pode fazer ao IA Analyst. Protege sua cota mensal contra uso abusivo.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Por minuto
                  <InfoTooltip text="Máximo de perguntas por minuto, por usuário. Padrão 10. Acima disso retorna 429." />
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={settings.config.aiAnalystRateLimit?.perMinute ?? 10}
                  onChange={e => setConfig({ aiAnalystRateLimit: { ...settings.config.aiAnalystRateLimit, perMinute: Math.max(1, Math.min(120, parseInt(e.target.value || '10', 10))) } })}
                  placeholder="10"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Por dia
                  <InfoTooltip text="Máximo de perguntas por dia, por usuário. Padrão 200. Reset à meia-noite UTC." />
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  value={settings.config.aiAnalystRateLimit?.perDay ?? 200}
                  onChange={e => setConfig({ aiAnalystRateLimit: { ...settings.config.aiAnalystRateLimit, perDay: Math.max(1, Math.min(10_000, parseInt(e.target.value || '200', 10))) } })}
                  placeholder="200"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Pixels & Analytics */}
        <section id="pixels" className="bg-white rounded-lg shadow p-6 space-y-3" style={showSection('pixels')}>
          <h2 className="font-semibold text-lg">Pixels e Analytics</h2>
          <p className="text-xs text-neutral-500">
            IDs dos pixels de marketing. Deixe em branco para desativar. Os scripts respeitam o consentimento LGPD do cliente.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-xs text-neutral-600">
                Google Tag Manager (GTM-XXXXXX)
                <InfoTooltip text="ID do Google Tag Manager. Cole o GTM-XXXXXX da sua conta. Loja respeita consent LGPD." />
              </span>
              <input
                value={settings.config.pixels?.gtmId ?? ''}
                onChange={e => setConfig({ pixels: { ...settings.config.pixels, gtmId: e.target.value || undefined } })}
                placeholder="GTM-XXXXXX"
                className="w-full border rounded px-3 py-2 text-sm font-mono mt-1"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-neutral-600">
                Google Analytics 4 (G-XXXXXXXXXX)
                <InfoTooltip text="ID do Google Analytics 4. Formato G-XXXXXXXXXX. Eventos automáticos: pageview, view_item, add_to_cart, purchase." />
              </span>
              <input
                value={settings.config.pixels?.gaTrackingId ?? ''}
                onChange={e => setConfig({ pixels: { ...settings.config.pixels, gaTrackingId: e.target.value || undefined } })}
                placeholder="G-XXXXXXXXXX"
                className="w-full border rounded px-3 py-2 text-sm font-mono mt-1"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-neutral-600">Meta Pixel ID</span>
              <input
                value={settings.config.pixels?.metaPixelId ?? ''}
                onChange={e => setConfig({ pixels: { ...settings.config.pixels, metaPixelId: e.target.value || undefined } })}
                placeholder="1234567890"
                className="w-full border rounded px-3 py-2 text-sm font-mono mt-1"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-neutral-600">TikTok Pixel ID</span>
              <input
                value={settings.config.pixels?.tiktokPixelId ?? ''}
                onChange={e => setConfig({ pixels: { ...settings.config.pixels, tiktokPixelId: e.target.value || undefined } })}
                placeholder="C12345..."
                className="w-full border rounded px-3 py-2 text-sm font-mono mt-1"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-neutral-600">Microsoft Clarity Project ID</span>
              <input
                value={settings.config.pixels?.clarityProjectId ?? ''}
                onChange={e => setConfig({ pixels: { ...settings.config.pixels, clarityProjectId: e.target.value || undefined } })}
                placeholder="abcde12345"
                className="w-full border rounded px-3 py-2 text-sm font-mono mt-1"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-neutral-600">Google Ads Conversion (AW-XXX)</span>
              <input
                value={settings.config.pixels?.googleAdsConversionId ?? ''}
                onChange={e => setConfig({ pixels: { ...settings.config.pixels, googleAdsConversionId: e.target.value || undefined } })}
                placeholder="AW-1234567890"
                className="w-full border rounded px-3 py-2 text-sm font-mono mt-1"
              />
            </label>
          </div>
        </section>

        <section id="robots" className="bg-white rounded-lg shadow p-6 space-y-3" style={showSection('robots')}>
          <h2 className="font-semibold text-lg">
            Robots.txt
            <InfoTooltip text="Em branco usa default. Edite só se precisar bloquear bots específicos ou liberar áreas restritas." />
          </h2>
          <p className="text-xs text-neutral-500">
            Deixe em branco para usar o padrão automático. Somente altere se necessário para integrações específicas.
          </p>
          <textarea
            rows={6}
            value={settings.config.robotsTxt ?? ''}
            onChange={e => setConfig({ robotsTxt: e.target.value || undefined })}
            placeholder={`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /carrinho\nDisallow: /conta/`}
            className="w-full border rounded px-3 py-2 text-sm font-mono"
          />
        </section>

        {/* Save */}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-neutral-900 text-white text-sm rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </button>
          {saved && <span className="text-sm text-green-600">✓ Salvo com sucesso</span>}
        </div>
      </form>
          )}
        </div>
      </div>
    </main>
  );
}
