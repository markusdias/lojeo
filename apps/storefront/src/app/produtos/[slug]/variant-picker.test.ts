import { describe, it, expect } from 'vitest';
import { detectJewelryKind } from './variant-picker';

describe('detectJewelryKind', () => {
  it('detecta anel via customFields.tipo', () => {
    expect(detectJewelryKind('produto-x', { tipo: 'Anel' })).toBe('anel');
    expect(detectJewelryKind('produto-x', { kind: 'aliança' })).toBe('anel');
    expect(detectJewelryKind('produto-x', { categoria: 'Ring' })).toBe('anel');
  });

  it('detecta colar via customFields', () => {
    expect(detectJewelryKind('produto-x', { tipo: 'Colar' })).toBe('colar');
    expect(detectJewelryKind('produto-x', { category: 'Necklace' })).toBe('colar');
    expect(detectJewelryKind('produto-x', { kind: 'gargantilha' })).toBe('colar');
  });

  it('detecta brinco via customFields', () => {
    expect(detectJewelryKind('produto-x', { tipo: 'Brinco' })).toBe('brinco');
    expect(detectJewelryKind('produto-x', { kind: 'earring' })).toBe('brinco');
  });

  it('detecta tipo via prefixo do slug', () => {
    expect(detectJewelryKind('anel-solitario-ouro-18k', {})).toBe('anel');
    expect(detectJewelryKind('colar-veneziana-45cm', {})).toBe('colar');
    expect(detectJewelryKind('brinco-argola-pequena', {})).toBe('brinco');
    expect(detectJewelryKind('alianca-fosca', {})).toBe('anel');
  });

  it('detecta tipo via segmento do slug', () => {
    expect(detectJewelryKind('atelier-anel-solitario', {})).toBe('anel');
    expect(detectJewelryKind('classico-colar-veneziana', {})).toBe('colar');
  });

  it('customFields tem prioridade sobre slug', () => {
    expect(detectJewelryKind('anel-x', { tipo: 'Colar' })).toBe('colar');
  });

  it('retorna unknown quando não identifica', () => {
    expect(detectJewelryKind('pulseira-charm', {})).toBe('unknown');
    expect(detectJewelryKind('', {})).toBe('unknown');
  });
});
