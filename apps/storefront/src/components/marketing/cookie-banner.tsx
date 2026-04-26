'use client';

import { useEffect, useState } from 'react';
import { setConsent } from '@lojeo/tracking/client';

const CONSENT_KEY = 'lojeo_consent';

type Mode = 'hidden' | 'banner' | 'custom';

interface PreferenceState {
  analytics: boolean;
  marketing: boolean;
}

/**
 * Cookie banner LGPD — consent granular (essential, analytics, marketing).
 *
 * - Mostrado apenas em primeira visita (até `lojeo_consent` existir em localStorage)
 * - 3 ações: aceitar todos / apenas essenciais / personalizar
 * - Estilo discreto, fixed bottom, usa tokens jewelry-v1
 */
export function CookieBanner() {
  const [mode, setMode] = useState<Mode>('hidden');
  const [prefs, setPrefs] = useState<PreferenceState>({ analytics: true, marketing: false });

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) setMode('banner');
  }, []);

  if (mode === 'hidden') return null;

  function persist(next: PreferenceState) {
    setConsent({ analytics: next.analytics, marketing: next.marketing });
    setMode('hidden');
  }

  function acceptAll() {
    persist({ analytics: true, marketing: true });
  }

  function essentialsOnly() {
    persist({ analytics: false, marketing: false });
  }

  function savePreferences() {
    persist(prefs);
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies e preferências de privacidade"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'var(--sp-4, 16px)',
        left: 'var(--sp-4, 16px)',
        right: 'var(--sp-4, 16px)',
        maxWidth: '720px',
        margin: '0 auto',
        background: 'var(--surface, #fff)',
        color: 'var(--text-primary, #1A1612)',
        border: '1px solid var(--divider, #E8E2D5)',
        borderRadius: 'var(--r-md, 8px)',
        boxShadow: 'var(--shadow-lg, 0 12px 32px rgba(26,22,18,0.08))',
        padding: 'var(--sp-5, 20px) var(--sp-6, 24px)',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
        fontSize: 'var(--fs-small, 14px)',
        lineHeight: 'var(--lh-normal, 1.5)',
        zIndex: 9999,
      }}
    >
      {mode === 'banner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4, 16px)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary, #6B6055)' }}>
            Usamos cookies essenciais para o funcionamento da loja e, com seu consentimento, cookies
            analíticos e de marketing para personalizar sua experiência. Consulte nossa{' '}
            <a
              href="/privacidade"
              style={{ color: 'var(--text-primary, #1A1612)', textDecoration: 'underline' }}
            >
              Política de Privacidade
            </a>
            .
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'var(--sp-2, 8px)',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('custom')}
              style={ghostButtonStyle}
            >
              Personalizar
            </button>
            <button
              type="button"
              onClick={essentialsOnly}
              style={ghostButtonStyle}
            >
              Apenas essenciais
            </button>
            <button
              type="button"
              onClick={acceptAll}
              style={primaryButtonStyle}
            >
              Aceitar todos
            </button>
          </div>
        </div>
      )}

      {mode === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4, 16px)' }}>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--fs-body, 16px)',
                fontWeight: 500,
                color: 'var(--text-primary, #1A1612)',
              }}
            >
              Preferências de cookies
            </p>
            <p style={{ margin: 'var(--sp-1, 4px) 0 0', color: 'var(--text-secondary, #6B6055)' }}>
              Escolha quais categorias de cookies você permite. Os essenciais são sempre ativos.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3, 12px)' }}>
            <PreferenceRow
              label="Essenciais"
              description="Necessários para login, carrinho e funcionamento da loja."
              checked
              disabled
              onChange={() => {}}
            />
            <PreferenceRow
              label="Analíticos"
              description="Ajudam a entender como a loja é usada (medição agregada)."
              checked={prefs.analytics}
              onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
            />
            <PreferenceRow
              label="Marketing"
              description="Permitem anúncios personalizados em outras plataformas."
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--sp-2, 8px)',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <button type="button" onClick={() => setMode('banner')} style={ghostButtonStyle}>
              Voltar
            </button>
            <button type="button" onClick={savePreferences} style={primaryButtonStyle}>
              Salvar preferências
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PreferenceRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

function PreferenceRow({ label, description, checked, disabled, onChange }: PreferenceRowProps) {
  return (
    <label
      style={{
        display: 'flex',
        gap: 'var(--sp-3, 12px)',
        alignItems: 'flex-start',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: 'var(--accent, #B8956A)' }}
        aria-describedby={`consent-${label.toLowerCase()}`}
      />
      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ color: 'var(--text-primary, #1A1612)', fontWeight: 500 }}>{label}</span>
        <span
          id={`consent-${label.toLowerCase()}`}
          style={{ color: 'var(--text-secondary, #6B6055)', fontSize: 'var(--fs-caption, 12px)' }}
        >
          {description}
        </span>
      </span>
    </label>
  );
}

const baseButtonStyle: React.CSSProperties = {
  padding: 'var(--sp-2, 8px) var(--sp-4, 16px)',
  fontSize: 'var(--fs-small, 14px)',
  fontFamily: 'inherit',
  fontWeight: 500,
  borderRadius: 'var(--r-sm, 2px)',
  cursor: 'pointer',
  transition: 'background var(--dur-micro, 120ms) var(--ease-out, ease-out)',
};

const primaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: 'var(--text-primary, #1A1612)',
  color: 'var(--text-on-dark, #FAFAF6)',
  border: '1px solid var(--text-primary, #1A1612)',
};

const ghostButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: 'transparent',
  color: 'var(--text-primary, #1A1612)',
  border: '1px solid var(--divider, #E8E2D5)',
};
