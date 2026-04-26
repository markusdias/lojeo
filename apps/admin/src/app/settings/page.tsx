'use client';

import { useEffect, useState } from 'react';

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

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
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
