import { describe, expect, it } from 'vitest';
import {
  registerTemplate,
  loadTemplate,
  templateIds,
  formatMoneyCents,
  discountPercent,
  applyPixIncentive,
  slugify,
  generateSku,
} from './index';

describe('template registry', () => {
  it('carrega template registrado', async () => {
    registerTemplate('test-v1', async () => ({
      id: 'test-v1',
      name: 'Teste',
      locale: 'pt-BR',
      currency: 'BRL',
      fields: {},
      typography: {
        combos: [{ id: 'classic', label: 'Clássica', heading: 'Inter', body: 'Inter' }],
        default: 'classic',
      },
      palette: { primary: '#000', accent: '#fff', surface: '#fff', text: '#000' },
    }));
    const t = await loadTemplate('test-v1');
    expect(t.id).toBe('test-v1');
    expect(templateIds()).toContain('test-v1');
  });

  it('lança erro para template não registrado', async () => {
    await expect(loadTemplate('nao-existe')).rejects.toThrow();
  });
});

describe('pricing', () => {
  it('formata moeda BRL', () => {
    expect(formatMoneyCents(12990, 'BRL')).toMatch(/R\$\s*129,90/);
  });

  it('calcula desconto %', () => {
    expect(discountPercent({ priceCents: 8000, comparePriceCents: 10000 })).toBe(20);
    expect(discountPercent({ priceCents: 100, comparePriceCents: null })).toBe(0);
  });

  it('aplica incentivo Pix', () => {
    expect(applyPixIncentive(10000, { enabled: true, percent: 5 })).toBe(9500);
    expect(applyPixIncentive(10000, { enabled: false, percent: 5 })).toBe(10000);
  });
});

describe('sku', () => {
  it('slugify normaliza', () => {
    expect(slugify('Anel de Ouro 18k')).toBe('anel-de-ouro-18k');
  });

  it('generateSku monta prefixo + número', () => {
    expect(generateSku('Anel Ouro', 42)).toBe('ANELOURO-00042');
  });
});
