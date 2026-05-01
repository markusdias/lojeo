'use client';

import { useEffect, useRef, useState } from 'react';

interface ConnectionStatus {
  connected: boolean;
  accountEmail?: string;
  scopes?: string[];
  expiresAt?: string;
  oauthConfigured?: boolean;
}

interface GtmContainer { accountId: string; accountName: string; containerId: string; publicId: string; name: string }
interface Ga4Property { accountId: string; accountName: string; propertyId: string; propertyName: string; measurementId?: string }
interface AdsCustomer { customerId: string; resourceName: string }

interface ResourcesPayload {
  gtm: GtmContainer[];
  ga4: Ga4Property[];
  ads: AdsCustomer[];
  errors: { gtm?: string; ga4?: string; ads?: string };
}

interface PixelsValue {
  gtmId?: string;
  gaTrackingId?: string;
  googleAdsConversionId?: string;
}

interface Props {
  pixels: PixelsValue;
  onChange: (next: PixelsValue) => void;
}

export function GoogleConnectCard({ pixels, onChange }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<ResourcesPayload | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const initialUrlChecked = useRef(false);

  async function loadStatus() {
    setLoading(true);
    try {
      const r = await fetch('/api/oauth/google', { cache: 'no-store' });
      if (r.ok) setStatus((await r.json()) as ConnectionStatus);
    } finally {
      setLoading(false);
    }
  }

  async function loadResources() {
    setResourcesLoading(true);
    try {
      const r = await fetch('/api/oauth/google/resources', { cache: 'no-store' });
      if (r.ok) {
        setResources((await r.json()) as ResourcesPayload);
      } else {
        const err = (await r.json().catch(() => ({}))) as { message?: string };
        setFlash({ ok: false, text: err.message ?? `Erro ao listar recursos (HTTP ${r.status})` });
      }
    } finally {
      setResourcesLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    if (!status?.connected) {
      setResources(null);
      return;
    }
    if (!resources) void loadResources();
  }, [status?.connected]);

  // Pega flash do redirect do callback
  useEffect(() => {
    if (initialUrlChecked.current) return;
    initialUrlChecked.current = true;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const g = url.searchParams.get('google');
    const reason = url.searchParams.get('reason');
    const email = url.searchParams.get('email');
    if (g === 'connected') {
      setFlash({ ok: true, text: `Google conectado${email ? ` · ${email}` : ''}` });
    } else if (g === 'error') {
      setFlash({ ok: false, text: `Falha ao conectar: ${reason ?? 'erro desconhecido'}` });
    }
    if (g) {
      url.searchParams.delete('google');
      url.searchParams.delete('reason');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  async function handleConnect() {
    window.location.href = '/api/oauth/google/start';
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar Google? GTM, GA4 e Ads param de listar via 1-clique (IDs salvos não são apagados).')) return;
    const r = await fetch('/api/oauth/google', { method: 'DELETE' });
    if (r.ok) {
      setStatus({ connected: false });
      setResources(null);
      setFlash({ ok: true, text: 'Desconectado.' });
    } else {
      setFlash({ ok: false, text: `Erro ao desconectar (HTTP ${r.status})` });
    }
  }

  if (loading) {
    return (
      <div className="lj-card" style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-muted)' }}>
        Carregando conexão Google…
      </div>
    );
  }

  const isConnected = status?.connected === true;
  const oauthConfigured = status?.oauthConfigured !== false;

  return (
    <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <GoogleLogo />
            <p style={{ fontWeight: 'var(--w-medium)', margin: 0 }}>Google · GTM, Analytics e Ads</p>
            {isConnected && (
              <span style={{
                padding: '2px 10px', fontSize: 11, fontWeight: 500, borderRadius: 999,
                background: '#DCFCE7', color: '#166534',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#166534' }} />
                Conectado
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
            Conecte sua conta Google uma vez e selecione GTM, Google Analytics 4 e Google Ads sem copiar IDs.
          </p>
          {isConnected && status?.accountEmail && (
            <p style={{ fontSize: 12, color: 'var(--fg-secondary)', margin: '6px 0 0' }}>
              Conta: <strong>{status.accountEmail}</strong>
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isConnected && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!oauthConfigured}
              title={oauthConfigured ? '' : 'Configure AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET no servidor'}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                background: oauthConfigured ? '#fff' : '#f5f5f5',
                color: oauthConfigured ? '#3c4043' : '#9aa0a6',
                border: '1px solid #dadce0',
                borderRadius: 4,
                cursor: oauthConfigured ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <GoogleLogo size={16} />
              Conectar com Google
            </button>
          )}
          {isConnected && (
            <>
              <button
                type="button"
                onClick={() => void loadResources()}
                disabled={resourcesLoading}
                style={{
                  padding: '6px 14px', fontSize: 13, background: 'transparent',
                  color: 'var(--fg)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)', cursor: resourcesLoading ? 'wait' : 'pointer',
                }}
              >
                {resourcesLoading ? 'Atualizando…' : 'Atualizar'}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                style={{
                  padding: '6px 14px', fontSize: 13, background: 'transparent',
                  color: 'var(--error, #B91C1C)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)', cursor: 'pointer',
                }}
              >
                Desconectar
              </button>
            </>
          )}
        </div>
      </div>

      {flash && (
        <p style={{ fontSize: 12, marginTop: 12, color: flash.ok ? '#166534' : '#B91C1C' }}>
          {flash.ok ? '✓' : '✗'} {flash.text}
        </p>
      )}

      {!oauthConfigured && !isConnected && (
        <div style={{ marginTop: 12, padding: 10, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, fontSize: 12, color: '#92400E' }}>
          <strong>Setup pendente do servidor.</strong> Para liberar o 1-clique, o admin precisa configurar credenciais OAuth Google:
          <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li>Abra <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: '#92400E', textDecoration: 'underline' }}>Google Cloud Console → Credentials</a></li>
            <li>Crie um <em>OAuth 2.0 Client ID</em> tipo <em>Web application</em></li>
            <li>Authorized redirect URI: <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/oauth/google/callback` : '/api/oauth/google/callback'}</code></li>
            <li>Habilite as APIs: <em>Tag Manager</em>, <em>Google Analytics Admin</em>, <em>Google Ads</em></li>
            <li>Defina <code>AUTH_GOOGLE_ID</code> e <code>AUTH_GOOGLE_SECRET</code> no <code>.env</code> do admin</li>
            <li>Reinicie o servidor</li>
          </ol>
          Enquanto isso, use o <strong>Modo manual</strong> abaixo.
        </div>
      )}

      {isConnected && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {resourcesLoading && !resources && (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Carregando contêineres GTM, propriedades GA4 e contas Ads…</p>
          )}

          {resources && (
            <div style={{ display: 'grid', gap: 14 }}>
              <ResourceSelect
                label="Google Tag Manager"
                hint="Container do GTM que vai orquestrar todas as tags."
                emptyMsg="Nenhum container GTM nesta conta."
                error={resources.errors.gtm}
                value={pixels.gtmId ?? ''}
                onChange={(v) => onChange({ ...pixels, gtmId: v || undefined })}
                options={resources.gtm.map((c) => ({
                  value: c.publicId,
                  label: `${c.publicId} — ${c.name}`,
                  group: c.accountName,
                }))}
              />

              <ResourceSelect
                label="Google Analytics 4"
                hint="Propriedade que recebe pageviews, add_to_cart, purchase."
                emptyMsg="Nenhuma propriedade GA4 ativa."
                error={resources.errors.ga4}
                value={pixels.gaTrackingId ?? ''}
                onChange={(v) => onChange({ ...pixels, gaTrackingId: v || undefined })}
                options={resources.ga4
                  .filter((p) => p.measurementId)
                  .map((p) => ({
                    value: p.measurementId!,
                    label: `${p.measurementId} — ${p.propertyName}`,
                    group: p.accountName,
                  }))}
              />

              <ResourceSelect
                label="Google Ads (conversões)"
                hint="Conta Ads pra rastrear conversões. Opcional."
                emptyMsg={
                  resources.errors.ads
                    ? 'Google Ads precisa de aprovação separada — use modo manual abaixo se já tem ID.'
                    : 'Nenhuma conta Ads acessível.'
                }
                error={resources.errors.ads}
                value={pixels.googleAdsConversionId ?? ''}
                onChange={(v) => onChange({ ...pixels, googleAdsConversionId: v || undefined })}
                options={resources.ads.map((a) => ({
                  value: `AW-${a.customerId}`,
                  label: `AW-${a.customerId}`,
                }))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SelectOption { value: string; label: string; group?: string }

function ResourceSelect({
  label,
  hint,
  emptyMsg,
  error,
  options,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  emptyMsg: string;
  error?: string;
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const grouped = options.reduce<Record<string, SelectOption[]>>((acc, opt) => {
    const k = opt.group ?? '__';
    (acc[k] ??= []).push(opt);
    return acc;
  }, {});

  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)' }}>
        {label}
      </label>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 6px' }}>{hint}</p>
      {options.length === 0 ? (
        <p style={{ fontSize: 12, color: error ? '#B91C1C' : 'var(--fg-muted)' }}>
          {error ? `✗ ${error}` : emptyMsg}
        </p>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', fontSize: 13,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 6px)',
            background: 'var(--surface, #fff)',
          }}
        >
          <option value="">— Selecionar —</option>
          {Object.entries(grouped).map(([group, opts]) =>
            group === '__' ? (
              opts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))
            ) : (
              <optgroup key={group} label={group}>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ),
          )}
        </select>
      )}
    </div>
  );
}

function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
