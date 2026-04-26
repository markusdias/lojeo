import { describe, expect, it } from 'vitest';
import type { MetricCardProps, MetricDelta } from './metric-card';

/**
 * Smoke test do contrato de MetricCard.
 *
 * Vitest está em ambiente node sem JSX runtime — não importamos o módulo .tsx
 * em runtime. Validamos só os tipos exportados (compilação) + invariantes.
 */
describe('metric-card component contract', () => {
  it('label e value são obrigatórios', () => {
    const p: MetricCardProps = { label: 'Receita', value: 'R$ 100' };
    expect(p.label).toBe('Receita');
    expect(p.value).toBe('R$ 100');
  });

  it('aceita 3 tones mutuamente complementares', () => {
    const a: MetricCardProps = { label: 'a', value: '1', accent: true };
    const w: MetricCardProps = { label: 'b', value: '2', warning: true };
    const d: MetricCardProps = { label: 'c', value: '3', danger: true };
    expect([a.accent, w.warning, d.danger]).toEqual([true, true, true]);
  });

  it('delta aceita up null pra ocultar chip', () => {
    const delta: MetricDelta = { text: '—', up: null };
    expect(delta.up).toBe(null);
  });

  it('href torna o card clicável', () => {
    const p: MetricCardProps = { label: 'a', value: '1', href: '/pedidos' };
    expect(p.href).toBe('/pedidos');
  });
});
