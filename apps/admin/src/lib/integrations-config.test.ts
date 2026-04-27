import { describe, it, expect } from 'vitest';
import {
  maskValue,
  isMaskedValue,
  maskCredentials,
  mergeCredentials,
  isProviderConnected,
  PROVIDERS,
  getProvider,
} from './integrations-config';

describe('integrations-config', () => {
  describe('maskValue', () => {
    it('mascara mantendo últimos 4 chars', () => {
      expect(maskValue('sk-ant-1234567890abcd')).toBe('••••abcd');
    });
    it('valor undefined retorna string vazia', () => {
      expect(maskValue(undefined)).toBe('');
    });
    it('valor curto ainda mascara', () => {
      expect(maskValue('abc')).toBe('••••abc');
    });
  });

  describe('isMaskedValue', () => {
    it('detecta valor mascarado', () => {
      expect(isMaskedValue('••••abcd')).toBe(true);
    });
    it('valor real retorna false', () => {
      expect(isMaskedValue('sk-real-key')).toBe(false);
    });
    it('undefined retorna false', () => {
      expect(isMaskedValue(undefined)).toBe(false);
    });
  });

  describe('maskCredentials', () => {
    it('mascara todas chaves', () => {
      const result = maskCredentials({ apiKey: 'real-key-1234', secret: 'super-secret-9999' });
      expect(result).toEqual({ apiKey: '••••1234', secret: '••••9999' });
    });
    it('undefined retorna objeto vazio', () => {
      expect(maskCredentials(undefined)).toEqual({});
    });
  });

  describe('mergeCredentials — sentinel pattern', () => {
    it('valor mascarado NÃO sobrescreve real', () => {
      const existing = { apiKey: 'sk-real-1234' };
      const incoming = { apiKey: '••••1234' };
      expect(mergeCredentials(existing, incoming)).toEqual({ apiKey: 'sk-real-1234' });
    });
    it('valor novo sobrescreve', () => {
      const existing = { apiKey: 'old-key' };
      const incoming = { apiKey: 'new-key-xyz' };
      expect(mergeCredentials(existing, incoming)).toEqual({ apiKey: 'new-key-xyz' });
    });
    it('campo vazio NÃO apaga existente', () => {
      const existing = { apiKey: 'real' };
      expect(mergeCredentials(existing, { apiKey: '   ' })).toEqual({ apiKey: 'real' });
    });
    it('adiciona novos campos', () => {
      const existing = { clientId: 'BLG-X' };
      expect(mergeCredentials(existing, { clientSecret: 'cs-new' })).toEqual({
        clientId: 'BLG-X',
        clientSecret: 'cs-new',
      });
    });
    it('lida com existing undefined', () => {
      expect(mergeCredentials(undefined, { apiKey: 'k' })).toEqual({ apiKey: 'k' });
    });
  });

  describe('isProviderConnected', () => {
    const bling = PROVIDERS.bling!;
    it('connected via env vars completas', () => {
      expect(isProviderConnected(bling, ['BLING_CLIENT_ID', 'BLING_CLIENT_SECRET'], undefined)).toBe(true);
    });
    it('connected via stored credentials completas', () => {
      expect(
        isProviderConnected(bling, [], { clientId: 'BLG-X', clientSecret: 's' }),
      ).toBe(true);
    });
    it('not connected sem nada', () => {
      expect(isProviderConnected(bling, [], undefined)).toBe(false);
    });
    it('not connected com credentials parciais', () => {
      expect(isProviderConnected(bling, [], { clientId: 'BLG-X' })).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('retorna definição existente', () => {
      expect(getProvider('bling')?.name).toBe('Bling');
    });
    it('retorna null para id desconhecido', () => {
      expect(getProvider('xpto')).toBeNull();
    });
  });
});
