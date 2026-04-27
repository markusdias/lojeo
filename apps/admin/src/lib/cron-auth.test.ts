import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkCronSecret } from './cron-auth';

function makeReq(headerValue?: string) {
  return {
    headers: {
      get(name: string) {
        if (name === 'x-cron-secret' && headerValue !== undefined) return headerValue;
        return null;
      },
    },
  };
}

describe('cron-auth', () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });
  afterEach(() => {
    if (original !== undefined) process.env.CRON_SECRET = original;
  });

  describe('checkCronSecret', () => {
    it('false sem env CRON_SECRET', () => {
      expect(checkCronSecret(makeReq('any'))).toBe(false);
    });
    it('false sem header', () => {
      process.env.CRON_SECRET = 'top-secret-123';
      expect(checkCronSecret(makeReq())).toBe(false);
    });
    it('false com header errado', () => {
      process.env.CRON_SECRET = 'top-secret-123';
      expect(checkCronSecret(makeReq('wrong'))).toBe(false);
    });
    it('true com header correto', () => {
      process.env.CRON_SECRET = 'top-secret-123';
      expect(checkCronSecret(makeReq('top-secret-123'))).toBe(true);
    });
    it('false com tamanho diferente (timing-safe)', () => {
      process.env.CRON_SECRET = 'top-secret-123';
      expect(checkCronSecret(makeReq('top-secret-1234'))).toBe(false);
    });
    it('false com header vazio', () => {
      process.env.CRON_SECRET = 'top-secret-123';
      expect(checkCronSecret(makeReq(''))).toBe(false);
    });
  });
});
