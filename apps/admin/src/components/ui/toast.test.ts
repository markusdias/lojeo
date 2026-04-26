import { describe, expect, it } from 'vitest';
import type { ToastVariant, ToastInput } from './toast';

/**
 * Smoke test do contrato público de Toast.
 *
 * Vitest está em ambiente node sem JSX runtime — não importamos o módulo .tsx
 * em runtime. Validamos só os tipos exportados (compilação) + invariantes.
 */
describe('toast component contract', () => {
  it('aceita 4 variants tipadas', () => {
    const variants: ToastVariant[] = ['success', 'warning', 'error', 'info'];
    expect(variants).toHaveLength(4);
  });

  it('ToastInput permite duration opcional e título obrigatório', () => {
    const t: ToastInput = { title: 'oi' };
    expect(t.title).toBe('oi');
    const t2: ToastInput = { title: 'oi', variant: 'success', duration: 0 };
    expect(t2.duration).toBe(0);
  });
});
