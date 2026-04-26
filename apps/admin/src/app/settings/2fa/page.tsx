'use client';

import { useEffect, useState } from 'react';

interface Status {
  enabled: boolean;
  enabledAt: string | null;
  lastUsedAt: string | null;
  recoveryCodesRemaining: number;
}

export default function TwoFactorPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Setup state
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  // Disable state
  const [disableToken, setDisableToken] = useState('');

  function load() {
    setLoading(true);
    fetch('/api/2fa').then(r => r.json()).then((d: Status) => {
      setStatus(d);
      setLoading(false);
    }).catch(e => { setError(String(e)); setLoading(false); });
  }

  useEffect(load, []);

  async function startSetup() {
    setBusy(true);
    try {
      const res = await fetch('/api/2fa', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        alert(`Erro: ${d.error ?? res.status}`);
        return;
      }
      const d = await res.json() as { qr: string; secret: string };
      setSetupQr(d.qr);
      setSetupSecret(d.secret);
      setToken('');
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/2fa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        alert(`Erro: ${d.error ?? res.status}`);
        return;
      }
      const d = await res.json() as { recoveryCodes: string[] };
      setRecoveryCodes(d.recoveryCodes);
      setSetupQr(null);
      setSetupSecret(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm('Desabilitar 2FA reduz a segurança da sua conta. Confirmar?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableToken }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        alert(`Erro: ${d.error ?? res.status}`);
        return;
      }
      setDisableToken('');
      load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Carregando...</div>;
  if (error) return <div className="p-8 text-sm text-red-500">Erro: {error}</div>;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Autenticação de dois fatores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Adiciona uma camada de segurança ao login: além da senha, exige código de 6 dígitos do app autenticador.
        </p>
      </header>

      {recoveryCodes && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-5">
          <h2 className="font-semibold text-amber-900 mb-2">⚠ Salve estes códigos de recuperação agora</h2>
          <p className="text-sm text-amber-800 mb-3">
            Use um destes códigos se perder acesso ao app autenticador. Cada código pode ser usado uma única vez.
            <strong> Eles não serão exibidos novamente.</strong>
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-white rounded p-3 border border-amber-200">
            {recoveryCodes.map(c => <code key={c}>{c}</code>)}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(recoveryCodes.join('\n'))}
            className="text-sm text-amber-900 underline mt-3"
          >
            Copiar todos
          </button>
          <button
            onClick={() => setRecoveryCodes(null)}
            className="ml-4 text-sm text-amber-900 underline mt-3"
          >
            Já salvei
          </button>
        </div>
      )}

      {/* Estado: 2FA habilitado */}
      {status?.enabled && !recoveryCodes && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <p className="font-medium text-green-900">✓ 2FA habilitado</p>
          {status.enabledAt && (
            <p className="text-sm text-green-700 mt-1">
              Desde {new Date(status.enabledAt).toLocaleDateString('pt-BR')}
            </p>
          )}
          <p className="text-sm text-green-700">
            {status.recoveryCodesRemaining} códigos de recuperação restantes
          </p>

          <form onSubmit={disable2fa} className="mt-4 space-y-2">
            <p className="text-sm text-green-900">Para desabilitar, digite o código atual do app:</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableToken}
              onChange={e => setDisableToken(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-32 border border-gray-300 rounded px-3 py-2 text-sm font-mono text-center"
            />
            <button
              type="submit"
              disabled={busy || disableToken.length !== 6}
              className="lj-btn-danger ml-3"
            >
              Desabilitar 2FA
            </button>
          </form>
        </div>
      )}

      {/* Estado: setup em progresso */}
      {!status?.enabled && setupQr && (
        <div className="lj-card p-5 space-y-4">
          <h2 className="font-semibold">1. Escaneie o QR code</h2>
          <p className="text-sm text-gray-600">
            Use Google Authenticator, 1Password, Bitwarden ou Authy para escanear o QR abaixo.
          </p>
          <img src={setupQr} alt="QR Code 2FA" className="w-60 h-60" />
          <details>
            <summary className="text-sm text-indigo-600 cursor-pointer">Não consegue escanear? Use o segredo manual</summary>
            <code className="block mt-2 text-xs bg-gray-50 p-2 rounded font-mono">{setupSecret}</code>
          </details>
          <hr className="my-4" />
          <h2 className="font-semibold">2. Digite o código de 6 dígitos do app</h2>
          <form onSubmit={confirmSetup} className="flex gap-2 items-center">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              className="w-32 border border-gray-300 rounded px-3 py-2 text-sm font-mono text-center text-lg"
            />
            <button
              type="submit"
              disabled={busy || token.length !== 6}
              className="lj-btn-primary"
            >
              {busy ? 'Verificando...' : 'Confirmar e habilitar'}
            </button>
            <button
              type="button"
              onClick={() => { setSetupQr(null); setSetupSecret(null); }}
              className="text-sm text-gray-500 underline"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Estado: 2FA não habilitado */}
      {!status?.enabled && !setupQr && !recoveryCodes && (
        <div className="lj-card p-5">
          <p className="text-gray-700 mb-3">2FA não está habilitado nesta conta.</p>
          <button
            onClick={startSetup}
            disabled={busy}
            className="lj-btn-primary"
          >
            {busy ? 'Gerando...' : 'Habilitar 2FA'}
          </button>
        </div>
      )}

      <div className="text-xs text-gray-400">
        Apps recomendados: Google Authenticator, 1Password, Bitwarden, Authy.
      </div>
    </div>
  );
}
