'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { SettingsSidebar, useTabHash } from './sidebar-tabs';
import { NotificacoesPrefSection } from './notificacoes-prefs';
import { BrandGuideSection, RateLimitSection } from './ia-sections';
import {
  GatewaysCardsLive,
  FreteCardsLive,
  FiscalCardsLive,
  EmailCardsLive,
  WhatsappCardsLive,
  IaCardsLive,
  JobsCardsLive,
} from '../../components/integrations/integration-card';
import { GoogleConnectCard } from './google-connect-card';
import { MetaConnectCard } from './meta-connect-card';

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
    metaCapiToken?: string;     // System User Access Token (CAPI)
    tiktokPixelId?: string;     // C12345...
    clarityProjectId?: string;  // ABCDE12345
    googleAdsConversionId?: string; // AW-XXXX
  };
  brandGuide?: BrandGuide;
  aiProvider?: 'anthropic' | 'minimax';
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

  function setBrandGuide(patch: Partial<BrandGuide>) {
    setSettings(prev => prev ? {
      ...prev,
      config: { ...prev.config, brandGuide: { ...prev.config.brandGuide, ...patch } }
    } : prev);
  }

  if (!settings) {
    return <main className="p-8"><p className="text-neutral-500">Carregando…</p></main>;
  }

  // Tab → conteúdo sub-view (filter sections by active tab)
  const showSection = (tab: typeof activeTab) => activeTab === tab ? {} : { display: 'none' };

  // Cards-only tabs (Vendas/Comunicação/Jobs) renderizam fora do form
  const isCardsTab = activeTab === 'pagamentos' || activeTab === 'frete' || activeTab === 'fiscal' || activeTab === 'email' || activeTab === 'whatsapp' || activeTab === 'jobs' || activeTab === 'notificacoes';

  return (
    <main style={{ padding: 'var(--space-6) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-5)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--space-1)', color: 'var(--fg-muted)' }}>
          Configurações
        </p>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-1)' }}>
          {activeTab === 'identidade' ? 'Identidade da loja'
            : activeTab === 'pagamentos' ? 'Gateways de pagamento'
            : activeTab === 'frete' ? 'Frete e logística'
            : activeTab === 'fiscal' ? 'Fiscal e ERP'
            : activeTab === 'email' ? 'E-mail transacional'
            : activeTab === 'pixels' ? 'Pixels & Analytics'
            : activeTab === 'ia' ? 'IA · cota e brand guide'
            : activeTab === 'jobs' ? 'Jobs assíncronos'
            : activeTab === 'comercial' ? 'Políticas comerciais'
            : activeTab === 'robots' ? 'Robots.txt'
            : activeTab === 'notificacoes' ? 'Notificações'
            : 'Configurações da loja'
          }
        </h1>
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          {activeTab === 'pagamentos' ? 'Conecte uma ou mais formas de receber. OAuth de 1 clique — sem copiar chaves.'
            : activeTab === 'frete' ? 'Cotação automática e geração de etiquetas — Brasil e exterior.'
            : activeTab === 'fiscal' ? 'Emissão automática de NF-e por pedido + sync de estoque.'
            : activeTab === 'email' ? 'Confirmações de pedido, rastreio, recuperação de carrinho.'
            : activeTab === 'notificacoes' ? 'Escolha quais eventos geram alertas no sino. Mudanças valem para toda a equipe.'
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
          {activeTab === 'pagamentos' && <GatewaysCardsLive />}
          {activeTab === 'frete' && <FreteCardsLive />}
          {activeTab === 'fiscal' && <FiscalCardsLive />}
          {activeTab === 'email' && <EmailCardsLive />}
          {activeTab === 'whatsapp' && <WhatsappCardsLive />}
          {activeTab === 'jobs' && <JobsCardsLive />}
          {activeTab === 'notificacoes' && <NotificacoesPrefSection />}

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
            <h2 className="font-semibold text-lg">Provedores IA</h2>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Conecte Anthropic Claude e/ou MiniMax 2.7. Escolha abaixo qual provedor ativo usará para geração de descrições, IA Analyst e busca semântica.
            </p>
            <IaCardsLive />
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label className="text-sm font-medium text-neutral-700">Provedor ativo:</label>
              <select
                value={settings.config.aiProvider ?? 'anthropic'}
                onChange={e => setConfig({ aiProvider: e.target.value as 'anthropic' | 'minimax' })}
                className="border rounded px-3 py-2 text-sm"
                style={{ minWidth: 180 }}
              >
                <option value="anthropic">Anthropic Claude</option>
                <option value="minimax">MiniMax 2.7</option>
              </select>
              <span className="text-xs text-neutral-400">Usado para todas as funções de IA da plataforma</span>
            </div>
          </div>

          <BrandGuideSection
            brandGuide={settings.config.brandGuide}
            onChange={setBrandGuide}
          />

          <RateLimitSection
            value={settings.config.aiAnalystRateLimit}
            onChange={v => setConfig({ aiAnalystRateLimit: v })}
          />
        </section>

        {/* Pixels & Analytics */}
        <section id="pixels" className="bg-white rounded-lg shadow p-6 space-y-3" style={showSection('pixels')}>
          <h2 className="font-semibold text-lg">Pixels e Analytics</h2>
          <p className="text-xs text-neutral-500">
            IDs dos pixels de marketing. Deixe em branco para desativar. Os scripts respeitam o consentimento LGPD do cliente.
          </p>

          <GoogleConnectCard
            pixels={{
              gtmId: settings.config.pixels?.gtmId,
              gaTrackingId: settings.config.pixels?.gaTrackingId,
              googleAdsConversionId: settings.config.pixels?.googleAdsConversionId,
            }}
            onChange={(next) => setConfig({ pixels: { ...settings.config.pixels, ...next } })}
          />

          <div style={{ height: 12 }} />

          <MetaConnectCard
            pixels={{
              metaPixelId: settings.config.pixels?.metaPixelId,
              metaCapiToken: settings.config.pixels?.metaCapiToken,
            }}
            onChange={(next) => setConfig({ pixels: { ...settings.config.pixels, ...next } })}
          />

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--fg-secondary)', padding: '8px 0' }}>
              Modo manual (avançado) — colar IDs
            </summary>
          <div className="grid grid-cols-2 gap-3" style={{ marginTop: 12 }}>
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
          </details>
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
