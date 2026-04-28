'use client';

import { Suspense, useId, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

type AuthMode = 'login' | 'signup' | 'recover';

const isDev = process.env.NODE_ENV !== 'production';

const labelStyle: React.CSSProperties = {
  display: 'block',
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

const socialBtnBase: React.CSSProperties = {
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
  fontWeight: 500,
};

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
        margin: '20px 0 4px',
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      ou
      <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  type = 'button',
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  const off = !!disabled;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      style={{
        marginTop: 18,
        width: '100%',
        padding: '13px 16px',
        background: off ? 'var(--divider)' : 'var(--text-primary)',
        color: off ? 'var(--text-muted)' : 'var(--text-on-dark)',
        border: 'none',
        borderRadius: 4,
        fontSize: 14,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        cursor: off ? 'not-allowed' : 'pointer',
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </button>
  );
}

function GoogleBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        ...socialBtnBase,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

function AppleBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="Login com Apple chega na fase 1.2"
      style={{
        ...socialBtnBase,
        background: '#1A1612',
        border: '1px solid #1A1612',
        color: '#FAFAF6',
        cursor: 'not-allowed',
        opacity: 0.55,
        position: 'relative',
      }}
    >
      <AppleIcon />
      <span>{label}</span>
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
  );
}

function LegalFooter() {
  return (
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
  );
}

function LoginForm({
  callbackUrl,
  onSwitch,
}: {
  callbackUrl: string;
  onSwitch: (mode: AuthMode) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      setError('Login por email e senha em breve. Use sua conta Google por enquanto.');
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn('google', { callbackUrl });
  }

  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          lineHeight: 1.1,
          letterSpacing: 'var(--display-tracking, -0.01em)',
          margin: 0,
          color: 'var(--text-primary)',
          fontWeight: 400,
        }}
      >
        Entrar
      </h1>
      <p style={{ color: 'var(--text-secondary)', margin: '8px 0 28px', fontSize: 15 }}>É bom te ver.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <GoogleBtn onClick={handleGoogle} loading={loading} label="Continuar com Google" />
        <AppleBtn label="Continuar com Apple" />
      </div>
      <Divider />

      <form onSubmit={handleEmailSubmit} style={{ marginTop: 4 }}>
        <Field label="Email">
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={inputStyle}
          />
        </Field>
        <Field label="Senha">
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isDev ? 'modo dev — só email' : '••••••••'}
            style={inputStyle}
          />
        </Field>

        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={() => onSwitch('recover')}
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              borderBottom: '1px solid currentColor',
              paddingBottom: 1,
              background: 'transparent',
              border: 'none',
              borderBottomStyle: 'solid',
              borderBottomWidth: 1,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              padding: 0,
            }}
          >
            Esqueci minha senha
          </button>
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

        <PrimaryButton type="submit" disabled={loading || !email.trim()}>
          {loading ? 'Entrando…' : 'Entrar'}
        </PrimaryButton>
      </form>

      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginTop: 18,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Novo por aqui?{' '}
        <button
          type="button"
          onClick={() => onSwitch('signup')}
          style={{
            color: 'var(--text-primary)',
            borderBottom: '1px solid currentColor',
            background: 'transparent',
            border: 'none',
            borderBottomStyle: 'solid',
            borderBottomWidth: 1,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            padding: 0,
            fontSize: 13,
          }}
        >
          Criar conta
        </button>
      </p>
    </>
  );
}

function SignupForm({
  callbackUrl,
  onSwitch,
}: {
  callbackUrl: string;
  onSwitch: (mode: AuthMode) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tos, setTos] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  async function handleGoogle() {
    setLoading(true);
    await signIn('google', { callbackUrl });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !tos) return;
    setLoading(true);
    setError('');
    if (isDev) {
      const res = await signIn('dev-customer-login', { email, redirect: false });
      if (res?.error) {
        setError('Não conseguimos criar sua conta agora. Tenta de novo.');
        setLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } else {
      setError('Cadastro por email e senha em breve. Use sua conta Google por enquanto.');
      setLoading(false);
    }
  }

  // Prevent unused variable warnings while keeping the field functional.
  void name;
  void password;
  void optIn;

  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          lineHeight: 1.1,
          letterSpacing: 'var(--display-tracking, -0.01em)',
          margin: 0,
          color: 'var(--text-primary)',
          fontWeight: 400,
        }}
      >
        Criar conta
      </h1>
      <p style={{ color: 'var(--text-secondary)', margin: '8px 0 28px', fontSize: 15 }}>
        Leva menos de 1 minuto.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <GoogleBtn onClick={handleGoogle} loading={loading} label="Continuar com Google" />
        <AppleBtn label="Continuar com Apple" />
      </div>
      <Divider />

      <form onSubmit={handleSubmit}>
        <Field label="Nome">
          <input
            id={nameId}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Email">
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={inputStyle}
          />
        </Field>
        <Field label="Senha">
          <input
            id={passwordId}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 8 caracteres"
            style={inputStyle}
          />
        </Field>

        <label
          style={{
            display: 'flex',
            gap: 10,
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginTop: 16,
            cursor: 'pointer',
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={tos}
            onChange={(e) => setTos(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            Aceito os{' '}
            <Link
              href="/termos"
              style={{ color: 'var(--text-primary)', borderBottom: '1px solid currentColor' }}
            >
              termos
            </Link>{' '}
            e{' '}
            <Link
              href="/privacidade"
              style={{ color: 'var(--text-primary)', borderBottom: '1px solid currentColor' }}
            >
              política de privacidade
            </Link>{' '}
            (LGPD).
          </span>
        </label>
        <label
          style={{
            display: 'flex',
            gap: 10,
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginTop: 10,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
          />
          Quero receber novidades por email (opcional)
        </label>

        {error && (
          <p role="alert" style={{ fontSize: 13, color: '#A84444', marginTop: 14 }}>
            {error}
          </p>
        )}

        <PrimaryButton type="submit" disabled={loading || !email.trim() || !tos}>
          {loading ? 'Criando…' : 'Criar conta'}
        </PrimaryButton>
      </form>

      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginTop: 18,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Já tem conta?{' '}
        <button
          type="button"
          onClick={() => onSwitch('login')}
          style={{
            color: 'var(--text-primary)',
            borderBottom: '1px solid currentColor',
            background: 'transparent',
            border: 'none',
            borderBottomStyle: 'solid',
            borderBottomWidth: 1,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            padding: 0,
            fontSize: 13,
          }}
        >
          Entrar
        </button>
      </p>
    </>
  );
}

function RecoverForm({ onSwitch }: { onSwitch: (mode: AuthMode) => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    // Endpoint de envio real ainda não existe; simulamos sucesso para fechar o fluxo visual.
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 600);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onSwitch('login')}
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: 24,
          background: 'transparent',
          border: 'none',
          padding: 0,
          fontFamily: 'var(--font-body)',
        }}
        aria-label="Voltar para login"
      >
        <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Voltar
      </button>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          lineHeight: 1.1,
          letterSpacing: 'var(--display-tracking, -0.01em)',
          margin: 0,
          color: 'var(--text-primary)',
          fontWeight: 400,
        }}
      >
        Recuperar senha
      </h1>

      {sent ? (
        <>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 28px', fontSize: 15 }}>
            Se houver uma conta com <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, você
            vai receber um link em alguns minutos.
          </p>
          <PrimaryButton onClick={() => onSwitch('login')}>Voltar para login</PrimaryButton>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 28px', fontSize: 15 }}>
            Enviaremos um link para seu email.
          </p>
          <Field label="Email">
            <input
              id={emailId}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={inputStyle}
            />
          </Field>

          <PrimaryButton type="submit" disabled={loading || !email.trim()}>
            {loading ? 'Enviando…' : 'Enviar link'}
          </PrimaryButton>
        </form>
      )}
    </>
  );
}

function EntrarContent() {
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = params.get('callbackUrl') ?? params.get('next') ?? '/conta';
  const paramMode = params.get('mode');
  const initialMode: AuthMode =
    paramMode === 'signup' ? 'signup' : paramMode === 'recover' ? 'recover' : 'login';
  const [mode, setModeState] = useState<AuthMode>(initialMode);

  const setMode = (next: AuthMode) => {
    setModeState(next);
    const sp = new URLSearchParams(params.toString());
    if (next === 'login') sp.delete('mode');
    else sp.set('mode', next);
    const qs = sp.toString();
    router.replace(`/entrar${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        minHeight: 'calc(100vh - 80px)',
      }}
      className="entrar-grid"
    >
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          padding: '60px 40px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {mode === 'login' && <LoginForm callbackUrl={callbackUrl} onSwitch={setMode} />}
          {mode === 'signup' && <SignupForm callbackUrl={callbackUrl} onSwitch={setMode} />}
          {mode === 'recover' && <RecoverForm onSwitch={setMode} />}
          <LegalFooter />
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface-warm)',
          display: 'grid',
          placeItems: 'center',
          padding: 40,
          position: 'relative',
          overflow: 'hidden',
        }}
        aria-hidden="true"
        className="entrar-aside"
      >
        <div
          style={{
            width: 'min(420px, 80%)',
            aspectRatio: '3/4',
            background: '#E8DDC9',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            right: 40,
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            Sua conta, suas peças.
          </div>
          Acompanhe pedidos, gerencie garantias e descubra peças sob medida.
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .entrar-grid { grid-template-columns: 1fr !important; }
          .entrar-aside { display: none !important; }
        }
      `}</style>
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
