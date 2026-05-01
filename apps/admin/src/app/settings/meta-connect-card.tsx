'use client';

import { useEffect, useRef, useState } from 'react';

interface ConnectionStatus {
  connected: boolean;
  accountEmail?: string;
  accountName?: string;
  scopes?: string[];
  expiresAt?: string;
  oauthConfigured?: boolean;
}

interface MetaPixel { id: string; name: string; businessId: string; businessName: string; lastFiredTime?: string }
interface MetaAdAccount { id: string; name: string; accountStatus?: number; businessId?: string }

interface ResourcesPayload {
  pixels: MetaPixel[];
  adAccounts: MetaAdAccount[];
  errors: { pixels?: string; adAccounts?: string };
}

interface PixelsValue {
  metaPixelId?: string;
  metaCapiToken?: string;
}

interface Props {
  pixels: PixelsValue;
  onChange: (next: PixelsValue) => void;
}

export function MetaConnectCard({ pixels, onChange }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<ResourcesPayload | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [showCapi, setShowCapi] = useState(false);
  const initialUrlChecked = useRef(false);

  async function loadStatus() {
    setLoading(true);
    try {
      const r = await fetch('/api/oauth/meta', { cache: 'no-store' });
      if (r.ok) setStatus((await r.json()) as ConnectionStatus);
    } finally {
      setLoading(false);
    }
  }

  async function loadResources() {
    setResourcesLoading(true);
    try {
      const r = await fetch('/api/oauth/meta/resources', { cache: 'no-store' });
      if (r.ok) {
        setResources((await r.json()) as ResourcesPayload);
      } else {
        const err = (await r.json().catch(() => ({}))) as { message?: string };
        setFlash({ ok: false, text: err.message ?? `Erro ao listar pixels (HTTP ${r.status})` });
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

  useEffect(() => {
    if (initialUrlChecked.current) return;
    initialUrlChecked.current = true;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const m = url.searchParams.get('meta');
    const reason = url.searchParams.get('reason');
    const email = url.searchParams.get('email');
    if (m === 'connected') {
      setFlash({ ok: true, text: `Meta conectado${email ? ` · ${email}` : ''}` });
    } else if (m === 'error') {
      setFlash({ ok: false, text: `Falha ao conectar: ${reason ?? 'erro desconhecido'}` });
    }
    if (m) {
      url.searchParams.delete('meta');
      url.searchParams.delete('reason');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  function handleConnect() {
    window.location.href = '/api/oauth/meta/start';
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar Meta? Pixels não serão mais listados (IDs salvos não são apagados).')) return;
    const r = await fetch('/api/oauth/meta', { method: 'DELETE' });
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
        Carregando conexão Meta…
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
            <MetaLogo />
            <p style={{ fontWeight: 'var(--w-medium)', margin: 0 }}>Meta · Pixel + Conversions API</p>
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
            Conecte com Facebook Business e selecione o pixel — sem copiar IDs. CAPI dobra a precisão dos anúncios.
          </p>
          {isConnected && (status?.accountName || status?.accountEmail) && (
            <p style={{ fontSize: 12, color: 'var(--fg-secondary)', margin: '6px 0 0' }}>
              Conta: <strong>{status.accountName ?? status.accountEmail}</strong>
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isConnected && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!oauthConfigured}
              title={oauthConfigured ? '' : 'Configure META_APP_ID e META_APP_SECRET no servidor'}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                background: oauthConfigured ? '#1877F2' : '#9aa0a6',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: oauthConfigured ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <MetaLogo size={16} mono />
              Conectar com Facebook
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
          <strong>Setup pendente do servidor.</strong> Para liberar o 1-clique, o admin precisa configurar app Meta:
          <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li>Abra <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" style={{ color: '#92400E', textDecoration: 'underline' }}>Meta for Developers → Apps</a></li>
            <li>Crie app tipo <em>Business</em></li>
            <li>Adicione produto <em>Facebook Login for Business</em></li>
            <li>Valid OAuth Redirect URI: <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/oauth/meta/callback` : '/api/oauth/meta/callback'}</code></li>
            <li>Permissões: <code>business_management</code>, <code>ads_read</code>, <code>ads_management</code> (App Review necessário pra prod)</li>
            <li>Defina <code>META_APP_ID</code> e <code>META_APP_SECRET</code> no <code>.env</code> e reinicie</li>
          </ol>
          Enquanto isso, use o <strong>Modo manual</strong> abaixo.
        </div>
      )}

      {isConnected && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {resourcesLoading && !resources && (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Carregando pixels e contas de anúncio…</p>
          )}

          {resources && (
            <div style={{ display: 'grid', gap: 14 }}>
              <PixelSelect
                label="Meta Pixel"
                hint="Pixel que vai receber PageView, AddToCart, Purchase do storefront."
                emptyMsg={
                  resources.errors.pixels
                    ? `Erro: ${resources.errors.pixels}`
                    : 'Nenhum pixel encontrado nas Business Accounts conectadas.'
                }
                error={resources.errors.pixels}
                value={pixels.metaPixelId ?? ''}
                onChange={(v) => onChange({ ...pixels, metaPixelId: v || undefined })}
                options={resources.pixels.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.id})`,
                  group: p.businessName,
                  hint: p.lastFiredTime ? `Último evento: ${new Date(p.lastFiredTime).toLocaleString('pt-BR')}` : 'Sem eventos recentes',
                }))}
              />

              <div>
                <button
                  type="button"
                  onClick={() => setShowCapi((v) => !v)}
                  style={{
                    fontSize: 12, color: 'var(--fg-secondary)', background: 'transparent',
                    border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
                  }}
                >
                  {showCapi ? '▾' : '▸'} Conversions API (server-side, opcional)
                </button>
                {showCapi && (
                  <div style={{ marginTop: 10, padding: 10, background: 'var(--surface-subtle, #FAFAF6)', borderRadius: 6 }}>
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 8px' }}>
                      Cole um <strong>System User Access Token</strong> (gerado no Business Settings → System Users).
                      Server-side dispara eventos Purchase/AddToCart pra superar ad-blockers (~30% de ganho de match).
                    </p>
                    <input
                      type="password"
                      value={pixels.metaCapiToken ?? ''}
                      onChange={(e) => onChange({ ...pixels, metaCapiToken: e.target.value || undefined })}
                      placeholder="EAA..."
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: 13, fontFamily: 'monospace',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md, 6px)',
                        background: 'var(--surface, #fff)',
                      }}
                    />
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '6px 0 0' }}>
                      <a href="https://www.facebook.com/business/help/2589275426846191" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                        Como gerar System User Token →
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SelectOption { value: string; label: string; group?: string; hint?: string }

function PixelSelect({
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
  const selected = options.find((o) => o.value === value);

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
        <>
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
          {selected?.hint && (
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 0' }}>{selected.hint}</p>
          )}
        </>
      )}
    </div>
  );
}

function MetaLogo({ size = 18, mono = false }: { size?: number; mono?: boolean }) {
  if (mono) {
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="#fff" aria-hidden="true">
        <path d="M22.4 36L22.4 22h4.5l.8-5.4h-5.3v-3.4c0-1.6.4-2.7 2.7-2.7H28V5.7c-.5-.1-2.2-.2-4.2-.2-4.2 0-7 2.5-7 7.2v4h-4.7V22h4.7v14h5.6z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <path fill="#1877F2" d="M36 18C36 8.06 27.94 0 18 0S0 8.06 0 18c0 8.98 6.58 16.43 15.18 17.78V23.2H10.6V18h4.58v-3.97c0-4.52 2.69-7.02 6.81-7.02 1.97 0 4.04.35 4.04.35v4.44h-2.28c-2.24 0-2.94 1.39-2.94 2.82V18h5l-.8 5.2h-4.2v12.58C29.42 34.43 36 26.98 36 18z"/>
      <path fill="#fff" d="M25.01 23.2L25.81 18h-5v-3.39c0-1.42.7-2.81 2.94-2.81h2.28V7.36s-2.07-.35-4.04-.35c-4.12 0-6.81 2.5-6.81 7.02V18H10.6v5.2h4.58v12.58c1.84.29 3.72.29 5.56 0V23.2h4.27z"/>
    </svg>
  );
}
