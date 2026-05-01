'use client';

import { useEffect, useState } from 'react';

interface PixelsValue { clarityProjectId?: string }

interface Props {
  pixels: PixelsValue;
  storeName?: string;
  storeDomain?: string | null;
  onChange: (next: PixelsValue) => void;
}

const ID_RE = /^[a-z0-9]{8,}$/i;

export function ClarityQuickSetup({ pixels, storeName, storeDomain, onChange }: Props) {
  const [draft, setDraft] = useState(pixels.clarityProjectId ?? '');
  const [validHint, setValidHint] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setDraft(pixels.clarityProjectId ?? '');
  }, [pixels.clarityProjectId]);

  const createUrl = (() => {
    const params = new URLSearchParams();
    if (storeName) params.set('name', storeName);
    if (storeDomain) params.set('url', storeDomain.startsWith('http') ? storeDomain : `https://${storeDomain}`);
    return `https://clarity.microsoft.com/projects/create?${params.toString()}`;
  })();

  function commit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      onChange({ ...pixels, clarityProjectId: undefined });
      setValidHint(null);
      return;
    }
    if (!ID_RE.test(trimmed)) {
      setValidHint({ ok: false, text: 'ID inválido — geralmente é um código curto alfanumérico (ex: abcde12345).' });
      return;
    }
    onChange({ ...pixels, clarityProjectId: trimmed });
    setValidHint({ ok: true, text: 'ID salvo. Lembre de salvar as configurações.' });
  }

  const isConnected = Boolean(pixels.clarityProjectId);

  return (
    <div className="lj-card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ClarityLogo />
            <p style={{ fontWeight: 'var(--w-medium)', margin: 0 }}>Microsoft Clarity · heatmaps + session replay</p>
            {isConnected && (
              <span style={{
                padding: '2px 10px', fontSize: 11, fontWeight: 500, borderRadius: 999,
                background: '#DCFCE7', color: '#166534',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#166534' }} />
                Configurado
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
            Gratuito, sem amostragem, com replay de sessão. Microsoft não tem OAuth — abrimos a tela de criação pré-preenchida.
          </p>
        </div>
        <a
          href={createUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 500,
            background: '#0078D4', color: '#fff',
            border: 'none', borderRadius: 4,
            textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <ClarityLogo size={16} mono />
          Criar projeto Clarity →
        </a>
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <ol style={{ margin: '0 0 12px 18px', padding: 0, fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
          <li>Clique em <strong>Criar projeto Clarity</strong> (abre nova aba pré-preenchida com nome e URL da loja).</li>
          <li>Login com Microsoft / Google / Facebook.</li>
          <li>Após criar, copie o <strong>Project ID</strong> (Settings → Setup → tracking code, é a string entre <code>{`'`}</code> no script).</li>
          <li>Cole abaixo:</li>
        </ol>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-secondary)', marginBottom: 4 }}>
          Project ID
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            placeholder="abcde12345"
            style={{
              flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: 'monospace',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md, 6px)',
              background: 'var(--surface, #fff)',
            }}
          />
          {draft && draft !== pixels.clarityProjectId && (
            <button
              type="button"
              onClick={() => commit(draft)}
              style={{
                padding: '6px 14px', fontSize: 13,
                background: 'var(--fg, #1A1A1A)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md, 8px)', cursor: 'pointer',
              }}
            >
              Salvar
            </button>
          )}
        </div>
        {validHint && (
          <p style={{ fontSize: 12, marginTop: 6, color: validHint.ok ? '#166534' : '#B91C1C' }}>
            {validHint.ok ? '✓' : '✗'} {validHint.text}
          </p>
        )}
      </div>
    </div>
  );
}

function ClarityLogo({ size = 18, mono = false }: { size?: number; mono?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill={mono ? '#fff' : '#0078D4'} />
      <path
        fill={mono ? '#0078D4' : '#fff'}
        d="M10.5 13.5a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3v-5zm5.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
      />
    </svg>
  );
}
