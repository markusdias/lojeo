import { describe, it, expect } from 'vitest';
import {
  validateAddress,
  normalizePostalCode,
  getAddressLayout,
  BR_STATES,
  US_STATES,
} from './validate';

describe('validateAddress BR', () => {
  const baseBR = {
    recipientName: 'Maria Silva',
    street: 'Rua das Flores',
    number: '123',
    city: 'São Paulo',
    postalCode: '01310-100',
    country: 'BR',
    state: 'SP',
  };

  it('endereço BR válido', () => {
    expect(validateAddress(baseBR).ok).toBe(true);
  });

  it('CEP sem hífen aceito', () => {
    expect(validateAddress({ ...baseBR, postalCode: '01310100' }).ok).toBe(true);
  });

  it('CEP curto rejeita', () => {
    const r = validateAddress({ ...baseBR, postalCode: '0131010' });
    expect(r.ok).toBe(false);
    expect(r.errors.postalCode).toBe('invalid_cep');
  });

  it('UF inválida rejeita', () => {
    const r = validateAddress({ ...baseBR, state: 'XX' });
    expect(r.ok).toBe(false);
    expect(r.errors.state).toBe('invalid_uf');
  });

  it('número vazio rejeita BR', () => {
    const r = validateAddress({ ...baseBR, number: '' });
    expect(r.ok).toBe(false);
    expect(r.errors.number).toBe('required');
  });

  it('todas UFs aceitas', () => {
    for (const uf of BR_STATES) {
      expect(validateAddress({ ...baseBR, state: uf }).ok).toBe(true);
    }
  });
});

describe('validateAddress US', () => {
  const baseUS = {
    recipientName: 'John Doe',
    street: '123 Main St',
    city: 'Beverly Hills',
    postalCode: '90210',
    country: 'US',
    state: 'CA',
  };

  it('ZIP 5 digit válido', () => {
    expect(validateAddress(baseUS).ok).toBe(true);
  });

  it('ZIP+4 válido (90210-1234)', () => {
    expect(validateAddress({ ...baseUS, postalCode: '90210-1234' }).ok).toBe(true);
  });

  it('ZIP curto rejeita', () => {
    expect(validateAddress({ ...baseUS, postalCode: '9021' }).errors.postalCode).toBe('invalid_zip');
  });

  it('state inválido rejeita', () => {
    expect(validateAddress({ ...baseUS, state: 'XX' }).errors.state).toBe('invalid_state');
  });

  it('todos US states', () => {
    for (const s of US_STATES) {
      expect(validateAddress({ ...baseUS, state: s }).ok).toBe(true);
    }
  });

  it('US não exige number', () => {
    expect(validateAddress(baseUS).ok).toBe(true);
  });
});

describe('validateAddress GB', () => {
  const baseGB = {
    recipientName: 'James Bond',
    street: '7 Hanover Square',
    city: 'London',
    postalCode: 'SW1A 1AA',
    country: 'GB',
  };

  it('postcode UK válido SW1A 1AA', () => {
    expect(validateAddress(baseGB).ok).toBe(true);
  });

  it('postcode M1 1AE válido', () => {
    expect(validateAddress({ ...baseGB, postalCode: 'M1 1AE' }).ok).toBe(true);
  });

  it('postcode CR2 6XH válido', () => {
    expect(validateAddress({ ...baseGB, postalCode: 'CR2 6XH' }).ok).toBe(true);
  });

  it('postcode inválido rejeita', () => {
    expect(validateAddress({ ...baseGB, postalCode: 'INVALID' }).errors.postalCode).toBe('invalid_postcode');
  });
});

describe('validateAddress EU genérico', () => {
  const baseDE = {
    recipientName: 'Hans Müller',
    street: 'Hauptstraße 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
  };

  it('DE postcode 5 digit válido', () => {
    expect(validateAddress(baseDE).ok).toBe(true);
  });

  it('FR postcode válido', () => {
    expect(validateAddress({ ...baseDE, country: 'FR', postalCode: '75001' }).ok).toBe(true);
  });

  it('postcode com caracteres inválidos rejeita', () => {
    expect(validateAddress({ ...baseDE, postalCode: 'a@!' }).errors.postalCode).toBe('invalid_postcode');
  });
});

describe('normalizePostalCode', () => {
  it('BR adiciona hífen', () => {
    expect(normalizePostalCode('01310100', 'BR')).toBe('01310-100');
    expect(normalizePostalCode('01310-100', 'BR')).toBe('01310-100');
  });

  it('UK uppercase + single space', () => {
    expect(normalizePostalCode('sw1a   1aa', 'GB')).toBe('SW1A 1AA');
  });

  it('US passthrough', () => {
    expect(normalizePostalCode('90210', 'US')).toBe('90210');
  });

  it('outros uppercase', () => {
    expect(normalizePostalCode('10115', 'DE')).toBe('10115');
  });
});

describe('getAddressLayout', () => {
  it('BR mostra UF dropdown + número + bairro + label CEP', () => {
    const l = getAddressLayout('BR');
    expect(l.postalCodeLabel).toBe('CEP');
    expect(l.showState).toBe(true);
    expect(l.states).toBe(BR_STATES);
    expect(l.showNumber).toBe(true);
    expect(l.showNeighborhood).toBe(true);
  });

  it('US mostra state dropdown + label ZIP + sem número', () => {
    const l = getAddressLayout('US');
    expect(l.postalCodeLabel).toBe('ZIP code');
    expect(l.states).toBe(US_STATES);
    expect(l.showNumber).toBe(false);
  });

  it('GB sem state + label Postcode', () => {
    const l = getAddressLayout('GB');
    expect(l.postalCodeLabel).toBe('Postcode');
    expect(l.showState).toBe(false);
  });

  it('DE genérico EN-US locale → "Postal code"', () => {
    const l = getAddressLayout('DE', 'en-US');
    expect(l.postalCodeLabel).toBe('Postal code');
  });
});
