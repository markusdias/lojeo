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
  scoreCustomers,
  segment,
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

describe('rfm', () => {
  const now = new Date('2026-01-31T00:00:00Z');

  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  const base = {
    userId: null,
    firstOrderAt: daysAgo(365),
  };

  const customers = [
    { email: 'champion@test.com', orderCount: 12, totalCents: 150_000, lastOrderAt: daysAgo(5), ...base },
    { email: 'loyal@test.com', orderCount: 8, totalCents: 90_000, lastOrderAt: daysAgo(20), ...base },
    { email: 'risk@test.com', orderCount: 5, totalCents: 60_000, lastOrderAt: daysAgo(90), ...base },
    { email: 'lost@test.com', orderCount: 4, totalCents: 30_000, lastOrderAt: daysAgo(180), ...base },
    { email: 'new@test.com', orderCount: 1, totalCents: 8_000, lastOrderAt: daysAgo(3), ...base },
  ];

  it('scoreCustomers retorna um profile por cliente', () => {
    const result = scoreCustomers(customers, now);
    expect(result).toHaveLength(5);
    expect(result[0].email).toBe('champion@test.com');
  });

  it('scoreCustomers calcula daysSinceLastOrder corretamente', () => {
    const result = scoreCustomers(customers, now);
    expect(result.find(c => c.email === 'champion@test.com')?.daysSinceLastOrder).toBe(5);
    expect(result.find(c => c.email === 'lost@test.com')?.daysSinceLastOrder).toBe(180);
  });

  it('champion tem scores altos', () => {
    const result = scoreCustomers(customers, now);
    const champ = result.find(c => c.email === 'champion@test.com')!;
    expect(champ.rfm.recency).toBeGreaterThanOrEqual(4);
    expect(champ.rfm.frequency).toBeGreaterThanOrEqual(4);
    expect(champ.rfm.monetary).toBeGreaterThanOrEqual(4);
    expect(champ.segment).toBe('champions');
  });

  it('novo cliente é segmento new', () => {
    const result = scoreCustomers(customers, now);
    const novo = result.find(c => c.email === 'new@test.com')!;
    expect(novo.rfm.frequency).toBe(1);
    expect(novo.segment).toBe('new');
  });

  it('segment retorna other para scores médios', () => {
    expect(segment({ recency: 2, frequency: 2, monetary: 2 })).toBe('other');
  });

  it('scoreCustomers com lista vazia retorna []', () => {
    expect(scoreCustomers([])).toEqual([]);
  });
});
