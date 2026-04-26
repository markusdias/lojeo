'use client';

import { Suspense, useState, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  margin: '0 auto',
  padding: '64px 24px 80px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: 6,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg)',
  border: '1px solid var(--divider)',
  borderRadius: 2,
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.94-3.08.45-1.09-.5-2.08-.46-3.21 0-1.42.55-2.18.39-3.04-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function Divider() {
  return (
    <div
      role="separator"
      aria-label="ou"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        color: 'var(--text-muted)',
        fontSize: 12,
        margin: '24px 0 8px',
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      ou
      <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
    </div>
  );
}

function EntrarContent() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? params.get('next') ?? '/conta';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isDev = process.env.NODE_ENV !== 'production';
  const emailId = useId();
  const passwordId = useId();

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    if (isDev) {
      const res = await signIn('dev-customer-login', { email, redirect: false });
      if (res?.error) {
        setError('Email não encontrado ou inválido.');
        setLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } else {
      // Email/password provider ainda não implementado; orientar via Google.
      setError('Login por email e senha em breve. Use sua conta Google por enquanto.');
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn('google', { callbackUrl });
  }

  return (
    <div style={containerStyle}>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Acessar conta</p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 6vw, 52px)',
          lineHeight: 1.05,
          letterSpacing: 'var(--display-tracking, -0.01em)',
          margin: '0 0 12px',
          color: 'var(--text-primary)',
          fontWeight: 400,
        }}
      >
        Bem-vinda de volta
      </h1>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          margin: '0 0 36px',
          maxWidth: 380,
        }}
      >
        Entre pra acompanhar pedidos, salvar peças e ganhar pontos.
      </p>

      {/* OAuth buttons stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--divider)',
            borderRadius: 4,
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <GoogleIcon />
          Continuar com Google
        </button>

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Login com Apple chega na fase 1.2"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#1A1612',
            border: '1px solid #1A1612',
            borderRadius: 4,
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            color: '#FAFAF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            cursor: 'not-allowed',
            fontWeight: 500,
            opacity: 0.55,
            position: 'relative',
          }}
        >
          <AppleIcon />
          <span>Continuar com Apple</span>
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(250, 250, 246, 0.18)',
              color: '#FAFAF6',
              fontWeight: 600,
              marginLeft: 4,
            }}
          >
            Em breve
          </span>
        </button>
      </div>

      <Divider />

      {/* Email + senha form */}
      <form onSubmit={handleEmailSubmit} style={{ marginTop: 8 }}>
        <div style={{ marginTop: 14 }}>
          <label htmlFor={emailId} style={{ ...labelStyle, display: 'block' }}>Email</label>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <label htmlFor={passwordId} style={{ ...labelStyle, display: 'block' }}>Senha</label>
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={isDev ? 'modo dev — só email' : '••••••••'}
            disabled={!isDev && false}
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Link
            href="/recuperar-senha"
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              borderBottom: '1px solid currentColor',
              paddingBottom: 1,
            }}
          >
            Esqueceu a senha?
          </Link>
        </div>

        {error && (
          <p role="alert" style={{ fontSize: 13, color: '#A84444', marginTop: 14 }}>
            {error}
          </p>
        )}

        {isDev && (
          <p
            style={{
              fontSize: 11,
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              padding: '8px 12px',
              borderRadius: 4,
              marginTop: 14,
              letterSpacing: '0.04em',
            }}
          >
            Modo dev — autentica só com o email.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '13px 16px',
            background:
              loading || !email.trim() ? 'var(--divider)' : 'var(--text-primary)',
            color:
              loading || !email.trim() ? 'var(--text-muted)' : 'var(--text-on-dark)',
            border: 'none',
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {/* Footer creator-friendly link */}
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginTop: 28,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Primeira vez?{' '}
        <Link
          href="/"
          style={{
            color: 'var(--text-primary)',
            borderBottom: '1px solid currentColor',
            paddingBottom: 1,
          }}
        >
          Continue comprando
        </Link>{' '}
        — sua conta é criada automaticamente.
      </p>

      {/* LGPD legal footer */}
      <p
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 32,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Ao continuar, você concorda com nossos{' '}
        <Link href="/termos" style={{ borderBottom: '1px solid currentColor' }}>termos</Link>
        {' '}e{' '}
        <Link href="/privacidade" style={{ borderBottom: '1px solid currentColor' }}>política de privacidade</Link>.
      </p>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <Suspense>
      <EntrarContent />
    </Suspense>
  );
}
