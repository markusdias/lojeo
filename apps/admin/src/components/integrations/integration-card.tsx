'use client';

import { useEffect, useRef, useState } from 'react';

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
  docsUrl?: string;
  storedCredentials: Record<string, string>;
}

interface Resp {
  integrations: Integration[];
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

interface BadgeStyle { bg: string; text: string; label: string; dot: string }

const BASE_BADGE: Record<Integration['status'], BadgeStyle> = {
  connected:    { bg: '#FEF9C3', text: '#854D0E', label: 'Salvo, não verificado', dot: '#CA8A04' },
  partial:      { bg: '#FEF3C7', text: '#92400E', label: 'Parcial',              dot: '#92400E' },
  disconnected: { bg: '#F5F5F5', text: '#737373', label: 'Não configurado',      dot: '#737373' },
  optional:     { bg: '#F5F5F5', text: '#525252', label: 'Opcional',             dot: '#737373' },
};

const TEST_BADGE: Record<Exclude<TestStatus, 'idle'>, BadgeStyle> = {
  testing: { bg: '#EFF6FF', text: '#1E40AF', label: 'Verificando…',      dot: '#3B82F6' },
  ok:      { bg: '#DCFCE7', text: '#166534', label: 'Conectado ✓',       dot: '#166534' },
  error:   { bg: '#FEE2E2', text: '#B91C1C', label: 'Falha na conexão',  dot: '#EF4444' },
};

// Provider field definitions — espelha lib/integrations-config.ts
const PROVIDER_FIELDS: Record<string, ProviderDef> = {
  mercadopago: { id: 'mercadopago', name: 'Mercado Pago', category: 'Pagamentos', fields: [
    { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'APP_USR-...' },
    { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
  ]},
  stripe: { id: 'stripe', name: 'Stripe', category: 'Pagamentos', fields: [
    { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
    { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
  ]},
  paypal: { id: 'paypal', name: 'PayPal', category: 'Pagamentos', fields: [
    { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'AYt...' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
  ]},
  pagarme: { id: 'pagarme', name: 'Pagar.me', category: 'Pagamentos', fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
  ]},
  melhorenvio: { id: 'melhorenvio', name: 'Melhor Envio', category: 'Frete', fields: [
    { key: 'apiToken', label: 'API Token', type: 'password', required: true },
  ]},
  bling: { id: 'bling', name: 'Bling ERP', category: 'Fiscal', fields: [
    { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'BLG-...' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
  ]},
  olist: { id: 'olist', name: 'Olist Tiny', category: 'Fiscal', fields: [
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
  minimax: { id: 'minimax', name: 'MiniMax 2.7', category: 'IA', fields: [
    { key: 'groupId', label: 'Group ID', type: 'text', required: true, placeholder: '1234567890' },
    { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'eyJ...' },
  ]},
  removebg: { id: 'removebg', name: 'Remove.bg', category: 'IA', fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
  ]},
  triggerdev: { id: 'triggerdev', name: 'Trigger.dev', category: 'Jobs', fields: [
    { key: 'apiUrl', label: 'API URL', type: 'text', required: true, placeholder: 'https://api.trigger.dev' },
    { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'tr_pat_...' },
  ]},
};

interface Props { providerId: string }

let _statusCachePromise: Promise<Resp> | null = null;
const _subscribers = new Set<() => void>();

async function fetchStatus(force = false): Promise<Resp> {
  if (!_statusCachePromise || force) {
    _statusCachePromise = fetch('/api/integrations/status', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as Resp;
      })
      .catch((err) => { _statusCachePromise = null; throw err; });
  }
  return _statusCachePromise;
}

function notifyAll() { _subscribers.forEach((fn) => fn()); }

export function IntegrationCard({ providerId }: Props) {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState(false);
  const [formValues, setFormValues]   = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState<{ text: string; ok: boolean } | null>(null);
  const [testStatus, setTestStatus]   = useState<TestStatus>('idle');
  const [testMsg, setTestMsg]         = useState('');
  const [testReason, setTestReason]   = useState('');
  const autoTested                    = useRef(false);

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
    const sub = () => { autoTested.current = false; load(true); };
    _subscribers.add(sub);
    return () => { _subscribers.delete(sub); };
  }, [providerId]);

  // Auto-testa ao montar quando já há credenciais salvas
  useEffect(() => {
    if (!integration || autoTested.current) return;
    if (integration.status === 'connected' && integration.source !== 'env') {
      autoTested.current = true;
      void handleTest();
    }
  }, [integration]);

  async function handleTest() {
    setTestStatus('testing');
    setTestMsg('');
    setTestReason('');
    try {
      const r = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      const d = (await r.json()) as { ok: boolean; message: string; reason?: string };
      setTestStatus(d.ok ? 'ok' : 'error');
      setTestMsg(d.message);
      setTestReason(d.reason ?? '');
    } catch (err) {
      setTestStatus('error');
      setTestMsg('Erro ao chamar endpoint de teste');
      setTestReason(err instanceof Error ? err.message : String(err));
    }
  }

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

  const isViaEnv = integration.source === 'env';
  const isConnected = integration.status === 'connected';

  // Badge: prioridade ao resultado do teste; env vars não são testadas (confiamos no processo)
  const badge: BadgeStyle = isViaEnv
    ? { bg: '#DCFCE7', text: '#166534', label: 'Conectado (env)', dot: '#166534' }
    : testStatus !== 'idle'
      ? TEST_BADGE[testStatus]
      : BASE_BADGE[integration.status];

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
        setMsg({ text: 'Credenciais salvas.', ok: true });
        setEditing(false);
        setTestStatus('idle');
        autoTested.current = false;
        notifyAll();
        // Testa imediatamente após salvar
        setTimeout(() => void handleTest(), 300);
      }
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'erro', ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm(`Desconectar ${provider?.name ?? providerId} e remover credenciais?`)) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/integrations/${providerId}`, { method: 'DELETE' });
      if (r.ok) {
        setTestStatus('idle');
        setTestMsg('');
        setTestReason('');
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

          {/* Nome + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4, flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 'var(--w-medium)', margin: 0 }}>{integration.name}</p>
            <span style={{
              padding: '2px 10px', fontSize: 11, fontWeight: 500, borderRadius: 999,
              background: badge.bg, color: badge.text,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: badge.dot, display: 'inline-block' }} />
              {badge.label}
            </span>
            {isViaEnv && (
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>via env</span>
            )}
          </div>

          {/* Resultado do teste */}
          {testStatus === 'ok' && testMsg && (
            <p style={{ fontSize: 12, color: '#166534', margin: '2px 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✓ {testMsg}
            </p>
          )}
          {testStatus === 'error' && (
            <div style={{ margin: '2px 0 4px' }}>
              <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>✗ {testMsg}</p>
              {testReason && (
                <p style={{ fontSize: 11, color: '#B91C1C', margin: '2px 0 0', opacity: 0.8 }}>
                  Motivo: {testReason}
                </p>
              )}
            </div>
          )}

          {/* Mensagem de save */}
          {msg && (
            <p style={{ fontSize: 12, marginTop: 4, color: msg.ok ? 'var(--success)' : 'var(--error)', margin: '4px 0 0' }}>
              {msg.text}
            </p>
          )}

          {/* Helper + docs (só quando não editando) */}
          {integration.helper && !editing && (
            <p style={{ fontSize: 12, marginTop: 6, color: 'var(--fg-muted)', margin: '6px 0 0', whiteSpace: 'pre-line' }}>
              {integration.helper}
            </p>
          )}
          {integration.docsUrl && !editing && !isConnected && (
            <a href={integration.docsUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: 'var(--accent, #6B7280)', textDecoration: 'underline', marginTop: 6, display: 'inline-block' }}>
              Ver documentação ↗
            </a>
          )}
        </div>

        {/* Botões de ação */}
        {!isViaEnv && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {!editing && isConnected && (
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={testStatus === 'testing'}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 500,
                  background: 'transparent',
                  color: testStatus === 'error' ? '#B91C1C' : 'var(--fg, #1A1A1A)',
                  border: `1px solid ${testStatus === 'error' ? '#FECACA' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: testStatus === 'testing' ? 'wait' : 'pointer',
                }}
              >
                {testStatus === 'testing' ? 'Testando…' : 'Testar'}
              </button>
            )}
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 500,
                  background: isConnected ? 'transparent' : 'var(--fg, #1A1A1A)',
                  color: isConnected ? 'var(--fg, #1A1A1A)' : '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: 'pointer',
                }}
              >
                {isConnected ? 'Editar' : 'Conectar'}
              </button>
            )}
            {isConnected && integration.source === 'config' && !editing && (
              <button
                type="button"
                onClick={disconnect}
                disabled={saving}
                style={{
                  padding: '6px 14px', fontSize: 13,
                  background: 'transparent', color: 'var(--error, #B91C1C)',
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

      {/* Formulário de edição */}
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
                  width: '100%', padding: '8px 12px', fontSize: 13,
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
                padding: '6px 14px', fontSize: 13, background: 'transparent',
                color: 'var(--fg-secondary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md, 8px)', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                padding: '6px 14px', fontSize: 13, fontWeight: 500,
                background: 'var(--fg, #1A1A1A)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius-md, 8px)', cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'Salvando…' : 'Salvar e Testar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GatewaysCardsLive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard providerId="mercadopago" />
      <IntegrationCard providerId="pagarme" />
      <IntegrationCard providerId="stripe" />
      <IntegrationCard providerId="paypal" />
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
      <IntegrationCard providerId="minimax" />
      <IntegrationCard providerId="removebg" />
    </div>
  );
}

export function JobsCardsLive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard providerId="triggerdev" />
    </div>
  );
}
