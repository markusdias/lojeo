'use client';

import { useEffect, useState, type FormEvent } from 'react';

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
    typo?: string;
    accent?: string;
    bgTone?: string;
  };
  brandGuide?: BrandGuide;
}

interface Settings {
  name: string;
  domain: string | null;
  templateId: string;
  config: TenantConfig;
}

const TYPO_OPTIONS = [
  { value: 'a', label: 'Clássico-Luxo (Playfair + Inter)' },
  { value: 'b', label: 'Editorial-Moderno (EB Garamond + Plus Jakarta)' },
  { value: 'c', label: 'Minimalista-Contemporâneo (Inter)' },
];

const ACCENT_OPTIONS = [
  { value: 'champagne', label: 'Champagne Dourado' },
  { value: 'rose-gold', label: 'Ouro Rosê' },
  { value: 'platinum', label: 'Platina' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'ivory', label: 'Marfim' },
];

const BG_OPTIONS = [
  { value: 'warm', label: 'Warm (padrão)' },
  { value: 'cool', label: 'Cool' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Configurações da loja</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Template: <code className="bg-neutral-100 px-1 rounded">{settings.templateId}</code>
          {settings.domain && <> · Domínio: <code className="bg-neutral-100 px-1 rounded">{settings.domain}</code></>}
        </p>
      </header>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Identidade */}
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-lg">Identidade</h2>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nome da loja</label>
            <input
              type="text"
              value={settings.name}
              onChange={e => setSettings(prev => prev ? { ...prev, name: e.target.value } : prev)}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email de contato</label>
            <input
              type="email"
              value={settings.config.contactEmail ?? ''}
              onChange={e => setConfig({ contactEmail: e.target.value })}
              placeholder="contato@sujaloja.com.br"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </section>

        {/* Aparência */}
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-lg">Aparência do template</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tipografia</label>
              <select
                value={settings.config.appearance?.typo ?? 'a'}
                onChange={e => setAppearance({ typo: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {TYPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Cor de destaque</label>
              <select
                value={settings.config.appearance?.accent ?? 'champagne'}
                onChange={e => setAppearance({ accent: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {ACCENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tom de fundo</label>
              <select
                value={settings.config.appearance?.bgTone ?? 'warm'}
                onChange={e => setAppearance({ bgTone: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {BG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Políticas comerciais */}
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-lg">Políticas comerciais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Frete grátis acima de (R$)</label>
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Desconto Pix (%)</label>
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Parcelas máximas no cartão</label>
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Garantia padrão (meses)</label>
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
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Limite mensal IA (USD — 0 = ilimitado)</label>
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
        </section>

        {/* Robots.txt */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="font-semibold text-lg">Robots.txt</h2>
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
    </main>
  );
}
