import { describe, expect, it } from 'vitest';
import { TemplateConfigSchema } from '@lojeo/engine';
import { jewelryV1 } from './index';

describe('jewelry-v1 config', () => {
  it('passa validação Zod', () => {
    expect(() => TemplateConfigSchema.parse(jewelryV1)).not.toThrow();
  });

  it('tem 3 combos tipográficos curados', () => {
    expect(jewelryV1.typography.combos.length).toBe(3);
    const ids = jewelryV1.typography.combos.map((c) => c.id);
    expect(ids).toEqual(['classico-luxo', 'editorial-moderno', 'minimalista-contemporaneo']);
  });

  it('expõe campos de joia', () => {
    expect(jewelryV1.fields.material).toBeDefined();
    expect(jewelryV1.fields.aro?.options).toContain('18');
  });
});
