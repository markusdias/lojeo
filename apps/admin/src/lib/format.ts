/**
 * Helpers de formatação puros — sem dependências externas.
 *
 * Mantemos zero-deps para evitar bundle bloat e poder usar em
 * Server Components sem `'use client'`.
 */

/**
 * Tempo relativo em pt-BR para a coluna "Quando" da tabela de pedidos
 * e contextos de feed/atividade.
 *
 * Regras (espelham o design oficial Claude Design — Dashboard.jsx):
 *   - < 1 min  → "agora"
 *   - < 1 h    → "há Nmin"
 *   - < 24 h   → "há Nh"
 *   - < 7 d    → "há Nd"
 *   - >= 7 d   → data absoluta (`dd/mm/aaaa`)
 *
 * `now` é injetável para facilitar testes determinísticos.
 */
export function formatRelativeTime(date: Date | string | number, now: Date = new Date()): string {
  const ts = typeof date === 'string' || typeof date === 'number'
    ? new Date(date).getTime()
    : date.getTime();
  if (!Number.isFinite(ts)) return '—';

  const diff = now.getTime() - ts;
  if (diff < 0) return 'agora'; // futuro: tratamos como "agora" pra evitar "há -3 min"

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return 'agora';
  if (diff < hour) return `há ${Math.floor(diff / minute)} min`;
  if (diff < day) return `há ${Math.floor(diff / hour)} h`;
  if (diff < week) return `há ${Math.floor(diff / day)} d`;

  return new Date(ts).toLocaleDateString('pt-BR');
}

/**
 * Formata cents → BRL.
 * Mantemos aqui pra evitar duplicação inline em pages.
 */
export function fmtBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
