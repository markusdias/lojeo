'use client';

import { useEffect, useRef, useState } from 'react';

interface ConnectionStatus {
  connected: boolean;
  advertiserIds?: string[];
  oauthConfigured?: boolean;
}

interface TikTokAdvertiser { advertiserId: string; advertiserName: string }
interface TikTokPixel { pixelCode: string; pixelName: string; advertiserId: string; advertiserName: string }

interface ResourcesPayload {
  advertisers: TikTokAdvertiser[];
  pixels: TikTokPixel[];
  errors: { advertisers?: string; pixels?: string };
}

interface PixelsValue { tiktokPixelId?: string }

interface Props {
  pixels: PixelsValue;
  onChange: (next: PixelsValue) => void;
}

export function TikTokConnectCard({ pixels, onChange }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<ResourcesPayload | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const initialUrlChecked = useRef(false);

  async function loadStatus() {
    setLoading(true);
    try {
      const r = await fetch('/api/oauth/tiktok', { cache: 'no-store' });
      if (r.ok) setStatus((await r.json()) as ConnectionStatus);
    } finally {
      setLoading(false);
    }
  }

  async function loadResources() {
    setResourcesLoading(true);
    try {
      const r = await fetch('/api/oauth/tiktok/resources', { cache: 'no-store' });
      if (r.ok) setResources((await r.json()) as ResourcesPayload);
      else {
        const err = (await r.json().catch(() => ({}))) as { message?: string };
        setFlash({ ok: false, text: err.message ?? `Erro ao listar pixels (HTTP ${r.status})` });
      }
    } finally {
      setResourcesLoading(false);
    }
  }

  useEffect(() => { void loadStatus(); }, []);

  useEffect(() => {
    if (!status?.connected) { setResources(null); return; }
    if (!resources) void loadResources();
  }, [status?.connected]);

  useEffect(() => {
    if (initialUrlChecked.current) return;
    initialUrlChecked.current = true;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const t = url.searchParams.get('tiktok');
    const reason = url.searchParams.get('reason');
    if (t === 'connected') setFlash({ ok: true, text: 'TikTok Business conectado.' });
    else if (t === 'error') setFlash({ ok: false, text: `Falha: ${reason ?? 'erro desconhecido'}` });
    if (t) {
      url.searchParams.delete('tiktok');
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  function handleConnect() { window.location.href = '/api/oauth/tiktok/start'; }

  async function handleDisconnect() {
    if (!confirm('Desconectar TikTok? Pixel ID salvo não é apagado.')) return;
    const r = await fetch('/api/oauth/tiktok', { method: 'DELETE' });
    if (r.ok) {
      setStatus({ connected: false });
      setResources(null);
      setFlash({ ok: true, text: 'Desconectado.' });
    }
  }

  if (loading) {
    return (
      <div className="lj-card" style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--fg-muted)' }}>
        Carregando conexão TikTok…
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
            <TikTokLogo />
            <p style={{ fontWeight: 'var(--w-medium)', margin: 0 }}>TikTok · Pixel + Events API</p>
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
            Conecte com TikTok Business e selecione o pixel — sem copiar IDs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isConnected && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!oauthConfigured}
              title={oauthConfigured ? '' : 'Configure TIKTOK_APP_ID e TIKTOK_APP_SECRET'}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                background: oauthConfigured ? '#000' : '#9aa0a6',
                color: '#fff',
                border: 'none', borderRadius: 4,
                cursor: oauthConfigured ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <TikTokLogo size={16} mono />
              Conectar com TikTok
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
          <strong>Setup pendente do servidor.</strong> Configure app TikTok Business:
          <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li>Abra <a href="https://business-api.tiktok.com/portal/" target="_blank" rel="noreferrer" style={{ color: '#92400E', textDecoration: 'underline' }}>TikTok For Developers Portal</a></li>
            <li>Create app → Marketing API</li>
            <li>Advertiser Management + Pixel scopes</li>
            <li>Redirect URL: <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/oauth/tiktok/callback` : '/api/oauth/tiktok/callback'}</code></li>
            <li>Defina <code>TIKTOK_APP_ID</code> e <code>TIKTOK_APP_SECRET</code> e reinicie</li>
          </ol>
          Enquanto isso, use o <strong>Modo manual</strong> abaixo.
        </div>
      )}

      {isConnected && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {resourcesLoading && !resources && (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Carregando pixels…</p>
          )}
          {resources && (
            <PixelSelect
              label="TikTok Pixel"
              hint="Pixel que recebe ViewContent, AddToCart, Purchase."
              emptyMsg={
                resources.errors.pixels
                  ? `Erro: ${resources.errors.pixels}`
                  : 'Nenhum pixel encontrado nas contas conectadas.'
              }
              value={pixels.tiktokPixelId ?? ''}
              onChange={(v) => onChange({ ...pixels, tiktokPixelId: v || undefined })}
              options={resources.pixels.map((p) => ({
                value: p.pixelCode,
                label: `${p.pixelName} (${p.pixelCode})`,
                group: p.advertiserName,
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface SelectOption { value: string; label: string; group?: string }

function PixelSelect({
  label, hint, emptyMsg, options, value, onChange,
}: {
  label: string; hint: string; emptyMsg: string;
  options: SelectOption[]; value: string; onChange: (v: string) => void;
}) {
  const grouped = options.reduce<Record<string, SelectOption[]>>((acc, opt) => {
    const k = opt.group ?? '__';
    (acc[k] ??= []).push(opt);
    return acc;
  }, {});
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)' }}>{label}</label>
      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 6px' }}>{hint}</p>
      {options.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{emptyMsg}</p>
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
            group === '__' ? opts.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            )) : (
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

function TikTokLogo({ size = 18, mono = false }: { size?: number; mono?: boolean }) {
  if (mono) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.66 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.7-.1z"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#000" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.66 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.7-.1z"/>
    </svg>
  );
}
