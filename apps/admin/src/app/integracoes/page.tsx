'use client';

import { useEffect, useState, useCallback } from 'react';
import { InfoTooltip } from '../../components/ui/info-tooltip';

const CATEGORY_TOOLTIPS: Record<string, string> = {
  Pagamentos: 'Mercado Pago é principal para BR. Stripe entra na Fase 1.2 internacional.',
  Fiscal: 'Bling NF-e é obrigatório para venda física. Sem ele, emissão é manual.',
  Frete: 'Melhor Envio cobre Correios + Jadlog + transportadoras. Cotação automática reduz fricção.',
};

interface Integration {
  id: string;
  category: string;
  name: string;
  status: 'connected' | 'partial' | 'disconnected' | 'optional';
  message: string;
  envVarsRequired: string[];
  envVarsPresent: string[];
  storedCredentials: Record<string, string>;
  source: 'env' | 'config' | 'none';
  helper?: string;
  docsUrl?: string;
}

interface ProviderField {
  key: string;
  label: string;
  type: 'password' | 'text' | 'email';
  placeholder?: string;
  required?: boolean;
  helper?: string;
}

interface ProviderDef {
  id: string;
  name: string;
  category: string;
  fields: ProviderField[];
  helper?: string;
  docsUrl?: string;
}

interface Summary {
  connected: number;
  partial: number;
  disconnected: number;
  optional: number;
  total: number;
}

interface Resp {
  integrations: Integration[];
  summary: Summary;
  checkedAt: string;
}

const STATUS_STYLE: Record<Integration['status'], { bg: string; text: string; label: string; emoji: string }> = {
  connected:    { bg: 'var(--success-soft)', text: 'var(--success)', label: 'Conectada', emoji: '✓' },
  partial:      { bg: 'var(--warning-soft)', text: 'var(--warning)', label: 'Parcial',   emoji: '⚠' },
  disconnected: { bg: 'var(--neutral-50)',   text: 'var(--fg-muted)', label: 'Desconectada', emoji: '○' },
  optional:     { bg: 'var(--neutral-50)',   text: 'var(--neutral-500)', label: 'Opcional', emoji: '○' },
};

// Definição mínima dos providers (espelha lib/integrations-config.ts)
const PROVIDER_FIELDS: Record<string, ProviderDef> = {
  bling: { id: 'bling', name: 'Bling', category: 'Fiscal', fields: [
    { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'BLG-...' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
  ]},
  olist: { id: 'olist', name: 'Olist Tiny', category: 'Fiscal', fields: [
    { key: 'apiToken', label: 'API Token', type: 'password', required: true },
  ]},
  mercadopago: { id: 'mercadopago', name: 'Mercado Pago', category: 'Pagamentos', fields: [
    { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'APP_USR-...' },
    { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
  ]},
  stripe: { id: 'stripe', name: 'Stripe', category: 'Pagamentos', fields: [
    { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
    { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
  ]},
  pagarme: { id: 'pagarme', name: 'Pagar.me', category: 'Pagamentos', fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
  ]},
  melhorenvio: { id: 'melhorenvio', name: 'Melhor Envio', category: 'Frete', fields: [
    { key: 'apiToken', label: 'API Token', type: 'password', required: true },
  ]},
  resend: { id: 'resend', name: 'Resend', category: 'Email', fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 're_...' },
    { key: 'fromEmail', label: 'Email remetente', type: 'email', required: true, placeholder: 'no-reply@suamarca.com' },
  ]},
  sendgrid: { id: 'sendgrid', name: 'SendGrid', category: 'Email', fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    { key: 'fromEmail', label: 'Email remetente', type: 'email', required: true },
  ]},
  faqzap: { id: 'faqzap', name: 'FaqZap (WhatsApp)', category: 'WhatsApp', fields: [
    { key: 'apiToken', label: 'API Token', type: 'password', required: true },
  ]},
  anthropic: { id: 'anthropic', name: 'Anthropic Claude', category: 'IA', fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-ant-...' },
  ]},
};

export default function IntegracoesPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ provider: string; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/integrations/status', { cache: 'no-store' });
      const d = (await r.json()) as Resp & { error?: string };
      if (!r.ok) {
        setError(d.error ?? `HTTP ${r.status}`);
      } else {
        setData(d);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function startEdit(integration: Integration) {
    setEditing(integration.id);
    // Pre-fill com valores mascarados (usuário sobrescreve se quer mudar)
    setFormValues({ ...integration.storedCredentials });
    setActionMsg(null);
  }

  async function saveCredentials(providerId: string) {
    setSaving(true);
    setActionMsg(null);
    try {
      const r = await fetch(`/api/integrations/${providerId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ credentials: formValues }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string; field?: string };
        setActionMsg({ provider: providerId, text: d.field ? `Campo obrigatório: ${d.field}` : (d.error ?? 'Falha ao salvar'), ok: false });
      } else {
        setActionMsg({ provider: providerId, text: 'Credenciais salvas — conectado.', ok: true });
        setEditing(null);
        await load();
      }
    } catch (e) {
      setActionMsg({ provider: providerId, text: String(e), ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(providerId: string) {
    if (!confirm('Desconectar e remover credenciais?')) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/integrations/${providerId}`, { method: 'DELETE' });
      if (r.ok) {
        setActionMsg({ provider: providerId, text: 'Desconectado.', ok: true });
        await load();
      } else {
        setActionMsg({ provider: providerId, text: 'Falha ao desconectar', ok: false });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Carregando...</div>;
  if (error || !data) return <div className="p-8 text-sm text-red-500">Erro: {error}</div>;

  const byCategory = data.integrations.reduce<Record<string, Integration[]>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category]!.push(i);
    return acc;
  }, {});

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Integrações</h1>
        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
          Conecte serviços externos (pagamentos, fiscal, frete, email, IA). Conexão via painel ou variáveis de ambiente.
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <div className="lj-card p-4">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>Conectadas</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--success)' }}>{data.summary.connected}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>Parciais</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--warning)' }}>{data.summary.partial}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>Desconectadas</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--fg-muted)' }}>{data.summary.disconnected}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>Total</p>
          <p className="text-2xl font-semibold mt-1">{data.summary.total}</p>
        </div>
      </div>

      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-secondary)', display: 'inline-flex', alignItems: 'center' }}>
            {category}
            {CATEGORY_TOOLTIPS[category] && <InfoTooltip text={CATEGORY_TOOLTIPS[category]!} />}
          </h2>
          <div className="space-y-2">
            {items.map((i) => {
              const sc = STATUS_STYLE[i.status];
              const provider = PROVIDER_FIELDS[i.id];
              const isEditing = editing === i.id;
              const isViaEnv = i.source === 'env';
              return (
                <div key={i.id} className="lj-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{i.name}</p>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full" style={{ background: sc.bg, color: sc.text }}>
                          {sc.emoji} {sc.label}
                        </span>
                        {isViaEnv && (
                          <span style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>via env</span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{i.message}</p>
                      {i.helper && !isEditing && (
                        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{i.helper}</p>
                      )}
                      {actionMsg?.provider === i.id && (
                        <p style={{ fontSize: 12, marginTop: 8, color: actionMsg.ok ? 'var(--success)' : 'var(--error)' }}>
                          {actionMsg.text}
                        </p>
                      )}
                    </div>
                    {provider && !isViaEnv && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => startEdit(i)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 13,
                              background: i.status === 'connected' ? 'transparent' : 'var(--fg)',
                              color: i.status === 'connected' ? 'var(--fg)' : '#fff',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                          >
                            {i.status === 'connected' ? 'Editar' : 'Conectar'}
                          </button>
                        )}
                        {i.status === 'connected' && i.source === 'config' && !isEditing && (
                          <button
                            type="button"
                            onClick={() => disconnect(i.id)}
                            disabled={saving}
                            style={{
                              padding: '6px 14px',
                              fontSize: 13,
                              background: 'transparent',
                              color: 'var(--error)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                          >
                            Desconectar
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing && provider && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle, #f0f0f0)' }}>
                      {provider.fields.map((f) => (
                        <div key={f.key} style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 4 }}>
                            {f.label}{f.required && <span style={{ color: 'var(--error)' }}> *</span>}
                          </label>
                          <input
                            type={f.type}
                            placeholder={f.placeholder}
                            value={formValues[f.key] ?? ''}
                            onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              fontSize: 14,
                              fontFamily: f.type === 'password' || f.key.toLowerCase().includes('id') ? 'monospace' : 'inherit',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              background: 'var(--bg-elevated)',
                              color: 'var(--fg)',
                            }}
                          />
                          {f.helper && (
                            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>{f.helper}</p>
                          )}
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={() => saveCredentials(i.id)}
                          disabled={saving}
                          style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            background: 'var(--fg)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                          }}
                        >
                          {saving ? 'Salvando…' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditing(null); setFormValues({}); }}
                          style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            background: 'transparent',
                            color: 'var(--fg)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        {provider.docsUrl && (
                          <a
                            href={provider.docsUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ alignSelf: 'center', fontSize: 12, color: 'var(--fg-muted)', textDecoration: 'underline' }}
                          >
                            Documentação ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        Verificado em {new Date(data.checkedAt).toLocaleString('pt-BR')} · Reflete em /status público.
      </p>
    </div>
  );
}
