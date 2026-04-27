import { describe, it, expect } from 'vitest';
import { isValidCpf, stripCpf, formatCpf } from './cpf';

describe('cpf validator', () => {
  describe('stripCpf', () => {
    it('remove pontuação', () => {
      expect(stripCpf('123.456.789-09')).toBe('12345678909');
    });
    it('lida com input vazio', () => {
      expect(stripCpf('')).toBe('');
    });
  });

  describe('isValidCpf', () => {
    it('aceita CPFs válidos formatados e crus', () => {
      // Gerados via algoritmo (não são CPFs reais)
      expect(isValidCpf('123.456.789-09')).toBe(true);
      expect(isValidCpf('12345678909')).toBe(true);
    });

    it('aceita outro CPF válido', () => {
      // Calculado: 529.982.247-25 (exemplo público padrão de teste)
      expect(isValidCpf('529.982.247-25')).toBe(true);
    });

    it('rejeita CPFs com tamanho errado', () => {
      expect(isValidCpf('123')).toBe(false);
      expect(isValidCpf('123.456.789-0')).toBe(false);
      expect(isValidCpf('123.456.789-099')).toBe(false);
    });

    it('rejeita all-same-digit (000.000.000-00, 111.111.111-11, …)', () => {
      expect(isValidCpf('000.000.000-00')).toBe(false);
      expect(isValidCpf('111.111.111-11')).toBe(false);
      expect(isValidCpf('999.999.999-99')).toBe(false);
    });

    it('rejeita dígitos verificadores errados', () => {
      expect(isValidCpf('123.456.789-00')).toBe(false);
      expect(isValidCpf('123.456.789-99')).toBe(false);
    });

    it('rejeita string vazia ou null', () => {
      expect(isValidCpf('')).toBe(false);
      expect(isValidCpf('abc')).toBe(false);
    });
  });

  describe('formatCpf', () => {
    it('formata 11 dígitos', () => {
      expect(formatCpf('12345678909')).toBe('123.456.789-09');
    });
    it('retorna entrada se < 11 dígitos', () => {
      expect(formatCpf('1234')).toBe('1234');
    });
    it('formata mesmo já com pontuação parcial', () => {
      expect(formatCpf('123.45678909')).toBe('123.456.789-09');
    });
  });
});
