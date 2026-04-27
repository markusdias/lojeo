// Address validation per country — pure helpers, zero deps.
//
// Layouts suportados:
//  - BR: CEP 00000-000 (8 digits) + state UF + city
//  - US: ZIP 5-digit (or ZIP+4) + state 2-letter + city
//  - GB: postcode regex (UK Royal Mail format) + town
//  - EU genérico: postcode 4-10 chars + city + country obrigatório
//
// Validação retorna `{ ok, errors }` com keys legível pra UI.

export type AddressCountry = 'BR' | 'US' | 'GB' | 'DE' | 'FR' | 'ES' | 'IT' | 'NL' | 'PT' | 'BE' | 'AT' | 'IE' | 'CA';

export interface BaseAddressInput {
  recipientName: string;
  street: string;
  number?: string;
  complement?: string;
  city: string;
  postalCode: string;
  country: string;     // ISO-2
  state?: string;      // UF (BR), state code 2-letter (US), province (CA)
  phone?: string;
}

export interface AddressValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const;

export const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE',
  'PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

const CEP_REGEX = /^\d{5}-?\d{3}$/;
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;
// UK postcode: SW1A 1AA, M1 1AE, B33 8TH, CR2 6XH, DN55 1PT (Royal Mail)
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const GENERIC_POSTCODE_REGEX = /^[A-Z0-9-]{3,10}$/i;

export function validateAddress(input: BaseAddressInput): AddressValidationResult {
  const errors: Record<string, string> = {};
  const country = input.country.toUpperCase();

  if (!input.recipientName?.trim() || input.recipientName.trim().length < 2) {
    errors.recipientName = 'name_too_short';
  }
  if (!input.street?.trim()) errors.street = 'required';
  if (!input.city?.trim()) errors.city = 'required';

  if (!input.postalCode?.trim()) {
    errors.postalCode = 'required';
  } else {
    const pc = input.postalCode.trim();
    if (country === 'BR') {
      if (!CEP_REGEX.test(pc)) errors.postalCode = 'invalid_cep';
      if (!input.state || !BR_STATES.includes(input.state.toUpperCase() as typeof BR_STATES[number])) {
        errors.state = 'invalid_uf';
      }
    } else if (country === 'US') {
      if (!US_ZIP_REGEX.test(pc)) errors.postalCode = 'invalid_zip';
      if (!input.state || !US_STATES.includes(input.state.toUpperCase() as typeof US_STATES[number])) {
        errors.state = 'invalid_state';
      }
    } else if (country === 'GB') {
      if (!UK_POSTCODE_REGEX.test(pc)) errors.postalCode = 'invalid_postcode';
    } else if (['DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'BE', 'AT', 'IE', 'CA'].includes(country)) {
      if (!GENERIC_POSTCODE_REGEX.test(pc)) errors.postalCode = 'invalid_postcode';
    } else {
      // País não listado: aceita qualquer formato 3-10 chars
      if (!GENERIC_POSTCODE_REGEX.test(pc)) errors.postalCode = 'invalid_postcode';
    }
  }

  if (country === 'BR' && !input.number?.trim()) {
    // BR: obrigatório número (rua + número)
    errors.number = 'required';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function normalizePostalCode(postalCode: string, country: string): string {
  const c = country.toUpperCase();
  const pc = postalCode.trim();
  if (c === 'BR') {
    const digits = pc.replace(/\D/g, '');
    if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return pc;
  }
  if (c === 'GB') {
    return pc.toUpperCase().replace(/\s+/g, ' ');
  }
  if (c === 'US') {
    return pc;
  }
  return pc.toUpperCase();
}

export interface AddressLayoutFields {
  /** Rótulo do campo postal (CEP / ZIP / Postcode). */
  postalCodeLabel: string;
  /** State/province visível? */
  showState: boolean;
  /** Lista de estados/provinces predefinidos (US/BR/CA). */
  states?: readonly string[];
  /** Mostra campo número da rua? (BR sim, US/EU não — fica em street). */
  showNumber: boolean;
  /** Mostra neighborhood/district? (BR sim). */
  showNeighborhood: boolean;
}

export function getAddressLayout(country: string, locale: 'pt-BR' | 'en-US' = 'pt-BR'): AddressLayoutFields {
  const c = country.toUpperCase();
  const isPt = locale === 'pt-BR';
  if (c === 'BR') {
    return {
      postalCodeLabel: 'CEP',
      showState: true,
      states: BR_STATES,
      showNumber: true,
      showNeighborhood: true,
    };
  }
  if (c === 'US') {
    return {
      postalCodeLabel: 'ZIP code',
      showState: true,
      states: US_STATES,
      showNumber: false,
      showNeighborhood: false,
    };
  }
  if (c === 'GB') {
    return {
      postalCodeLabel: 'Postcode',
      showState: false,
      showNumber: false,
      showNeighborhood: false,
    };
  }
  // EU + outros
  return {
    postalCodeLabel: isPt ? 'CEP' : 'Postal code',
    showState: false,
    showNumber: false,
    showNeighborhood: false,
  };
}
