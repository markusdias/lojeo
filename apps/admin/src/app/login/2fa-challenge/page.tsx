'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function TwoFaChallengeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get('returnTo') || '/dashboard';

  const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
  const [token, setToken] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totpRef = useRef<HTMLInputElement>(null);
  const recoveryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'totp') totpRef.current?.focus();
    else recoveryRef.current?.focus();
  }, [mode]);

  function errorLabel(code: string): string {
    switch (code) {
      case 'invalid_token':
        return 'Código inválido. Verifique o app autenticador.';
      case 'invalid_recovery_code':
        return 'Código de recuperação inválido ou já utilizado.';
      case 'no_2fa_required':
        return '2FA não está habilitado nesta conta.';
      case 'unauthorized':
        return 'Sessão expirada. Faça login novamente.';
      case 'missing_credentials':
        return 'Informe o código.';
      default:
        return `Erro: ${code}`;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === 'totp' ? { token } : { recoveryCode };
      const res = await fetch('/api/2fa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errorLabel(d.error ?? String(res.status)));
        return;
      }
      // Sucesso — redireciona. router.replace para não voltar via histórico.
      router.replace(returnTo);
      router.refresh();
    } catch (err) {
      setError(`Falha de rede: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-50">
      <div className="lj-card max-w-sm w-full p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Verificação 2FA</h1>
          <p className="text-sm text-gray-600 mt-1">
            {mode === 'totp'
              ? 'Digite o código de 6 dígitos do seu app autenticador.'
              : 'Digite um código de recuperação (formato xxxxx-xxxxx).'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'totp' ? (
            <input
              ref={totpRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="lj-input text-center font-mono text-lg tracking-widest"
              autoFocus
              required
            />
          ) : (
            <input
              ref={recoveryRef}
              type="text"
              autoComplete="off"
              maxLength={11}
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toLowerCase())}
              placeholder="xxxxx-xxxxx"
              className="lj-input text-center font-mono"
              required
            />
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              busy ||
              (mode === 'totp' ? token.length !== 6 : recoveryCode.length < 10)
            }
            className="lj-btn-primary w-full"
          >
            {busy ? 'Verificando...' : 'Verificar'}
          </button>
        </form>

        <div className="text-center">
          {mode === 'totp' ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRecoveryCode('');
                setMode('recovery');
              }}
              className="text-sm text-indigo-600 underline"
            >
              Usar código de recuperação
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setToken('');
                setMode('totp');
              }}
              className="text-sm text-indigo-600 underline"
            >
              Usar código do app autenticador
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function TwoFaChallengePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-50">
          <div className="text-sm text-gray-500">Carregando...</div>
        </main>
      }
    >
      <TwoFaChallengeInner />
    </Suspense>
  );
}
