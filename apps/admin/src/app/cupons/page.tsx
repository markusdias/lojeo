'use client';

import { useEffect, useState } from 'react';
import { EmptyState, IconTag } from '../../components/ui/empty-state';

interface Coupon {
  id: string;
  code: string;
  name: string;
  type: 'percent' | 'fixed' | 'free_shipping' | string;
  value: number;
  minOrderCents: number;
  maxUses: number | null;
  usesCount: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  createdAt: string;
}

const TYPES = [
  { v: 'percent', label: '% sobre subtotal' },
  { v: 'fixed', label: 'R$ fixo (centavos)' },
  { v: 'free_shipping', label: 'Frete grátis' },
];

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatTypeValue(c: Coupon): string {
  if (c.type === 'percent') return `${c.value}%`;
  if (c.type === 'fixed') return formatCents(c.value);
  if (c.type === 'free_shipping') return 'Frete grátis';
  return `${c.type}: ${c.value}`;
}

function formatWindow(c: Coupon): string {
  const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString('pt-BR') : null;
  const a = fmt(c.startsAt);
  const b = fmt(c.endsAt);
  if (!a && !b) return 'Sem janela';
  if (a && b) return `${a} → ${b}`;
  if (a) return `A partir de ${a}`;
  return `Até ${b}`;
}

function couponStatus(c: Coupon): { label: string; color: string } {
  if (!c.active) return { label: 'Desativado', color: '#9CA3AF' };
  const now = Date.now();
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: 'Agendado', color: '#2563EB' };
  if (c.endsAt && new Date(c.endsAt).getTime() <= now) return { label: 'Expirado', color: '#9CA3AF' };
  if (c.maxUses !== null && c.usesCount >= c.maxUses) return { label: 'Esgotado', color: '#9CA3AF' };
  return { label: 'Ativo', color: '#16A34A' };
}

export default function CuponsPage() {
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('10');
  const [minOrderReais, setMinOrderReais] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  function load() {
    setLoading(true);
    fetch('/api/coupons')
      .then(async r => {
        const d = await r.json() as { coupons?: Coupon[]; error?: string };
        if (!r.ok) {
          setError(d.error ?? `HTTP ${r.status}`);
          setList([]);
        } else {
          setList(d.coupons ?? []);
          setError('');
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function resetForm() {
    setCode('');
    setName('');
    setType('percent');
    setValue('10');
    setMinOrderReais('0');
    setMaxUses('');
    setStartsAt('');
    setEndsAt('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const valueNum = type === 'free_shipping' ? 0 : Math.floor(Number(value) || 0);
      const minReais = Number(minOrderReais) || 0;
      const minCents = Math.floor(minReais * 100);
      const max = maxUses.trim() ? Math.floor(Number(maxUses)) : null;

      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
        // user digita reais para 'fixed'; armazena cents
        value: type === 'fixed' ? Math.floor(valueNum * 100) : valueNum,
        minOrderCents: minCents,
        maxUses: max,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
      };

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        alert(`Erro: ${d.error ?? res.status}`);
        return;
      }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  }

  async function disable(id: string, code: string) {
    if (!confirm(`Desativar cupom ${code}?`)) return;
    const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      alert(`Erro: ${d.error ?? res.status}`);
      return;
    }
    load();
  }

  async function reactivate(id: string) {
    const res = await fetch(`/api/coupons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      alert(`Erro: ${d.error ?? res.status}`);
      return;
    }
    load();
  }

  const valueHelp =
    type === 'percent' ? 'Percentual de 1 a 100' :
    type === 'fixed' ? 'Valor em reais (ex: 25 = R$ 25,00)' :
    'Frete grátis não usa valor';

  const valueDisabled = type === 'free_shipping';

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>
          Cupons de desconto
        </h1>
        <p className="body-s">
          Crie códigos promocionais para aplicar no checkout. Desativar preserva o histórico de pedidos que usaram o cupom.
        </p>
      </header>

      <form onSubmit={handleCreate} className="lj-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Novo cupom</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Código</label>
            <input
              required
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="BLACKFRIDAY10"
              className="lj-input w-full"
              maxLength={60}
            />
            <p className="text-[11px] text-gray-400 mt-1">A-Z, 0-9, _ ou - · 2 a 60 caracteres</p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Nome interno</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Black Friday 10%"
              className="lj-input w-full"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="lj-input w-full"
            >
              {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Valor</label>
            <input
              type="number"
              min={type === 'free_shipping' ? 0 : 1}
              max={type === 'percent' ? 100 : undefined}
              step={type === 'fixed' ? '0.01' : '1'}
              value={value}
              disabled={valueDisabled}
              onChange={e => setValue(e.target.value)}
              className="lj-input w-full"
            />
            <p className="text-[11px] text-gray-400 mt-1">{valueHelp}</p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Pedido mínimo (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minOrderReais}
              onChange={e => setMinOrderReais(e.target.value)}
              className="lj-input w-full"
            />
            <p className="text-[11px] text-gray-400 mt-1">0 = sem mínimo</p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Usos máximos</label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              placeholder="Ilimitado"
              className="lj-input w-full"
            />
            <p className="text-[11px] text-gray-400 mt-1">Em branco = sem limite</p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Início (opcional)</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              className="lj-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Fim (opcional)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              className="lj-input w-full"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="lj-btn-primary">
            {saving ? 'Criando…' : 'Criar cupom'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando…</p>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">{error}</div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<IconTag />}
          title="Nenhum cupom criado ainda"
          description="Cupons funcionam tanto para campanhas pontuais quanto para retenção pós-compra. É normal nas primeiras semanas — comece com um simples (10% OFF, primeiro pedido)."
        />
      ) : (
        <div className="lj-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Código</th>
                <th className="text-left px-4 py-2">Tipo / valor</th>
                <th className="text-left px-4 py-2">Usos</th>
                <th className="text-left px-4 py-2">Janela</th>
                <th className="text-left px-4 py-2">Mínimo</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => {
                const status = couponStatus(c);
                return (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <div className="font-mono font-semibold">{c.code}</div>
                      <div className="text-[11px] text-gray-500">{c.name}</div>
                    </td>
                    <td className="px-4 py-2">{formatTypeValue(c)}</td>
                    <td className="px-4 py-2 text-xs">
                      {c.usesCount}{c.maxUses !== null ? ` / ${c.maxUses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">{formatWindow(c)}</td>
                    <td className="px-4 py-2 text-xs">
                      {c.minOrderCents > 0 ? formatCents(c.minOrderCents) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${status.color}20`, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {c.active ? (
                        <button
                          onClick={() => disable(c.id, c.code)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivate(c.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Reativar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
