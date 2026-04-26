'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({})) as {
        ok?: boolean; error?: string; message?: string; redirect?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      const target = data.redirect ?? '/settings/users?accepted=1';
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleAccept} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
        />
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded px-4 py-2"
      >
        {loading ? 'Aceitando...' : 'Aceitar convite'}
      </button>
    </form>
  );
}
