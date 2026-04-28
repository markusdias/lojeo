'use client';

import { useEffect, useState } from 'react';

interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email';
  required?: boolean;
  placeholder?: string;
}

interface ProviderDef {
  id: string;
  name: string;
  category: string;
  fields: ProviderField[];
}

interface Integration {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'partial' | 'disconnected' | 'optional';
  source: 'config' | 'env' | 'unknown';
  message: string;
  helper?: string;
  storedCredentials: Record<string, string>;
}

interface Resp {
  integrations: Integration[];
}

const STATUS_STYLE: Record<Integration['status'], { bg: string; text: string; label: string; dot: string }> = {
  connected: { bg: 'var(--success-soft, #DCFCE7)', text: 'var(--success, #166534)', label: 'Conectado', dot: 'var(--success, #166534)' },
  partial: { bg: 'var(--warning-soft, #FEF3C7)', text: 'var(--warning, #92400E)', label: 'Parcial', dot: 'var(--warning, #92400E)' },
  disconnected: { bg: 'var(--neutral-50, #F5F5F5)', text: 'var(--fg-muted, #737373)', label: 'Desconectada', dot: 'var(--fg-muted, #737373)' },
  optional: { bg: 'var(--neutral-50, #F5F5F5)', text: 'var(--fg-secondary, #525252)', label: 'Opcional', dot: 'var(--fg-muted, #737373)' },
};

// Provider field definitions — espelha lib/integrations-config.ts
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

interface Props {
  providerId: string;
}

let _statusCachePromise: Promise<Resp> | null = null;
const _subscribers = new Set<() => void>();

async function fetchStatus(force = false): Promise<Resp> {
  if (!_statusCachePromise || force) {
    _statusCachePromise = fetch('/api/integrations/status', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as Resp;
      })
      .catch((err) => {
        _statusCachePromise = null;
        throw err;
      });
  }
  return _statusCachePromise;
}

function notifyAll() {
  _subscribers.forEach((fn) => fn());
}

export function IntegrationCard({ providerId }: Props) {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load(force = false) {
    setLoading(true);
    try {
      const data = await fetchStatus(force);
      const found = data.integrations.find((i) => i.id === providerId) ?? null;
      setIntegration(found);
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'erro', ok: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const sub = () => load(true);
    _subscribers.add(sub);
    return () => {
      _subscribers.delete(sub);
    };
  }, [providerId]);

  const provider = PROVIDER_FIELDS[providerId];

  if (!provider) {
    return (
      <div className="lj-card" style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-muted)' }}>
        Provider <code>{providerId}</code> não definido.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lj-card" style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-muted)' }}>
        Carregando {provider.name}…
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="lj-card" style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-muted)' }}>
        {provider.name}: status indisponível.
      </div>
    );
  }

  const sc = STATUS_STYLE[integration.status];
  const isViaEnv = integration.source === 'env';

  function startEdit() {
    setFormValues({ ...integration!.storedCredentials });
    setEditing(true);
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/integrations/${providerId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ credentials: formValues }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string; field?: string };
        setMsg({ text: d.field ? `Campo obrigatório: ${d.field}` : (d.error ?? `HTTP ${r.status}`), ok: false });
      } else {
        setMsg({ text: 'Credenciais salvas — conectado.', ok: true });
        setEditing(false);
        notifyAll();
      }
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'erro', ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!provider) return;
    if (!confirm(`Desconectar ${provider.name} e remover credenciais?`)) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/integrations/${providerId}`, { method: 'DELETE' });
      if (r.ok) {
        setMsg({ text: 'Desconectado.', ok: true });
        notifyAll();
      } else {
        setMsg({ text: `HTTP ${r.status}`, ok: false });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <p style={{ fontWeight: 'var(--w-medium)', margin: 0 }}>{integration.name}</p>
            <span
              style={{
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 999,
                background: sc.bg,
                color: sc.text,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
              {sc.label}
            </span>
            {isViaEnv && (
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>via env</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg-secondary)', margin: 0 }}>{integration.message}</p>
          {integration.helper && !editing && (
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--fg-muted)', margin: '4px 0 0' }}>{integration.helper}</p>
          )}
          {msg && (
            <p style={{ fontSize: 12, marginTop: 8, color: msg.ok ? 'var(--success)' : 'var(--error)' }}>{msg.text}</p>
          )}
        </div>
        {!isViaEnv && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  background: integration.status === 'connected' ? 'transparent' : 'var(--fg, #1A1A1A)',
                  color: integration.status === 'connected' ? 'var(--fg, #1A1A1A)' : '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: 'pointer',
                }}
              >
                {integration.status === 'connected' ? 'Editar' : 'Conectar'}
              </button>
            )}
            {integration.status === 'connected' && integration.source === 'config' && !editing && (
              <button
                type="button"
                onClick={disconnect}
                disabled={saving}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  background: 'transparent',
                  color: 'var(--error, #B91C1C)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                Desconectar
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
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
                  fontSize: 13,
                  fontFamily: f.type === 'password' ? 'monospace' : 'inherit',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 6px)',
                  background: 'var(--surface, #fff)',
                }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => { setEditing(false); setMsg(null); }}
              disabled={saving}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                background: 'transparent',
                color: 'var(--fg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--fg, #1A1A1A)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Wrapper grupos por categoria pra distribuir nos tabs settings. */
export function GatewaysCardsLive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard providerId="mercadopago" />
      <IntegrationCard providerId="pagarme" />
      <IntegrationCard providerId="stripe" />
    </div>
  );
}

export function FreteCardsLive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard providerId="melhorenvio" />
    </div>
  );
}

export function FiscalCardsLive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard providerId="bling" />
      <IntegrationCard providerId="olist" />
    </div>
  );
}

export function EmailCardsLive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard providerId="resend" />
      <IntegrationCard providerId="sendgrid" />
    </div>
  );
}

export function WhatsappCardsLive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard providerId="faqzap" />
    </div>
  );
}

export function IaCardsLive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard providerId="anthropic" />
    </div>
  );
}
