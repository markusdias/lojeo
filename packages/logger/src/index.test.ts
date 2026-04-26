import { describe, expect, it } from 'vitest';
import { logger, child } from './index';

describe('logger', () => {
  it('expõe instância pino válida', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('cria logger filho com bindings', () => {
    const c = child({ tenant: 'abc' });
    expect(typeof c.info).toBe('function');
  });
});
