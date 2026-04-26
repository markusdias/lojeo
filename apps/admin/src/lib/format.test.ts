import { describe, expect, it } from 'vitest';
import { formatRelativeTime, fmtBrl } from './format';

describe('formatRelativeTime', () => {
  const now = new Date('2026-04-26T12:00:00Z');

  it('< 1 min → "agora"', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 30 * 1000), now)).toBe('agora');
  });

  it('minutos → "há N min"', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 4 * 60_000), now)).toBe('há 4 min');
    expect(formatRelativeTime(new Date(now.getTime() - 22 * 60_000), now)).toBe('há 22 min');
  });

  it('horas → "há N h"', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 60 * 60_000), now)).toBe('há 1 h');
    expect(formatRelativeTime(new Date(now.getTime() - 3 * 60 * 60_000), now)).toBe('há 3 h');
  });

  it('dias < 7 → "há N d"', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 24 * 60 * 60_000), now)).toBe('há 1 d');
    expect(formatRelativeTime(new Date(now.getTime() - 6 * 24 * 60 * 60_000), now)).toBe('há 6 d');
  });

  it('>= 7 dias → data absoluta pt-BR', () => {
    const ts = new Date(now.getTime() - 10 * 24 * 60 * 60_000);
    expect(formatRelativeTime(ts, now)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('aceita string/number', () => {
    expect(formatRelativeTime((now.getTime() - 5 * 60_000), now)).toBe('há 5 min');
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe('há 5 min');
  });

  it('input inválido → "—"', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('—');
  });

  it('futuro → "agora" (não retorna negativo)', () => {
    expect(formatRelativeTime(new Date(now.getTime() + 60_000), now)).toBe('agora');
  });
});

describe('fmtBrl', () => {
  it('cents → BRL', () => {
    expect(fmtBrl(428090).replace(/\s/g, ' ')).toContain('4.280,90');
    expect(fmtBrl(0).replace(/\s/g, ' ')).toContain('0,00');
  });
});
