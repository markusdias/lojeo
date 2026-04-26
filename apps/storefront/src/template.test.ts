import { describe, expect, it } from 'vitest';
import { getActiveTemplate } from './template';

describe('storefront template loader', () => {
  it('carrega jewelry-v1 quando TEMPLATE_ID=jewelry-v1', async () => {
    process.env.TEMPLATE_ID = 'jewelry-v1';
    const tpl = await getActiveTemplate();
    expect(tpl.id).toBe('jewelry-v1');
    expect(tpl.locale).toBe('pt-BR');
    expect(tpl.currency).toBe('BRL');
    expect(tpl.typography.combos.length).toBe(3);
  });
});
