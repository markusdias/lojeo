import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('mescla classes Tailwind sem duplicar', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', undefined, 'font-bold')).toBe('text-red-500 font-bold');
  });
});
