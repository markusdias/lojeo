import { describe, it, expect } from 'vitest';
import {
  mockEmbedding,
  cosineSimilarity,
  encodeEmbedding,
  decodeEmbedding,
} from './embeddings';

describe('mockEmbedding', () => {
  it('é determinístico — mesmo input produz mesmo vetor', () => {
    const a = mockEmbedding('anel de ouro 18k com brilhante');
    const b = mockEmbedding('anel de ouro 18k com brilhante');
    expect(a).toEqual(b);
  });

  it('respeita parâmetro de dimensões', () => {
    expect(mockEmbedding('café especial torrado', 256)).toHaveLength(256);
    expect(mockEmbedding('café especial torrado', 128)).toHaveLength(128);
    expect(mockEmbedding('café especial torrado', 64)).toHaveLength(64);
  });

  it('similaridade entre textos próximos > textos distantes', () => {
    const a = mockEmbedding('anel ouro brilhante diamante joia');
    const b = mockEmbedding('anel ouro brilhante safira joia');
    const c = mockEmbedding('café arábica torra média origem brasil');
    const simAB = cosineSimilarity(a, b);
    const simAC = cosineSimilarity(a, c);
    expect(simAB).toBeGreaterThan(simAC);
    expect(simAB).toBeGreaterThan(0.3);
  });

  it('vetor não-vazio é normalizado L2 (norma ≈ 1)', () => {
    const v = mockEmbedding('colar prata feminino delicado pingente');
    let norm = 0;
    for (const x of v) norm += x * x;
    norm = Math.sqrt(norm);
    expect(norm).toBeCloseTo(1, 5);
  });

  it('texto vazio retorna vetor zero com dimensões corretas', () => {
    const v = mockEmbedding('', 256);
    expect(v).toHaveLength(256);
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it('é case-insensitive e ignora acentuação', () => {
    const a = mockEmbedding('Café Especial Brasileiro');
    const b = mockEmbedding('cafe especial brasileiro');
    // Acentuação removida + lowercase → mesmo vetor
    expect(a).toEqual(b);
  });

  it('lança erro para dimensões inválidas', () => {
    expect(() => mockEmbedding('teste', 0)).toThrow();
    expect(() => mockEmbedding('teste', -10)).toThrow();
  });
});

describe('cosineSimilarity', () => {
  it('vetor consigo mesmo retorna 1', () => {
    const v = mockEmbedding('joia minimalista contemporânea');
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('retorna 0 para vetores de dimensões diferentes', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it('retorna 0 para vetor zero', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('retorna 0 para arrays vazios', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe('encode/decodeEmbedding', () => {
  it('roundtrip preserva valores', () => {
    const v = mockEmbedding('anel ouro safira', 64);
    const encoded = encodeEmbedding(v);
    const decoded = decodeEmbedding(encoded);
    expect(decoded).toEqual(v);
  });

  it('decode retorna null para input inválido', () => {
    expect(decodeEmbedding(null)).toBeNull();
    expect(decodeEmbedding(undefined)).toBeNull();
    expect(decodeEmbedding('')).toBeNull();
    expect(decodeEmbedding('not json')).toBeNull();
    expect(decodeEmbedding('{"x":1}')).toBeNull();
    expect(decodeEmbedding('[1,2,"foo"]')).toBeNull();
    expect(decodeEmbedding('[1,2,null]')).toBeNull();
  });
});
