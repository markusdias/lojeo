// International shipping rates — DHL + FedEx (Fase 1.2 internacional).
//
// Sem credenciais: mock determinístico baseado em peso + zona destino.
// Com credenciais (DHL_API_KEY / FEDEX_API_KEY): chama API real.
//
// Returns array de quotes — frontend mostra opções pra cliente escolher.

import { logger } from '@lojeo/logger';

export type ShippingCarrier = 'dhl' | 'fedex' | 'correios_intl';

export interface ShippingRateInput {
  fromCountry: string;       // ISO-2 (origem da loja)
  toCountry: string;         // ISO-2 (destino do cliente)
  toPostalCode: string;
  weightG: number;           // gramas
  dimensionsCm?: { length: number; width: number; height: number };
  declaredValueCents?: number; // pra seguro (insurance)
  currency: 'USD' | 'EUR' | 'BRL';
}

export interface ShippingQuote {
  carrier: ShippingCarrier;
  service: string;            // "Express" / "Economy" / "Priority"
  amountCents: number;
  currency: string;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  source: 'mock' | 'real';
}

/**
 * Multiplicador zona — região destino determina custo base.
 * Mock simples — V2 substituir por tabela real ou lookup API.
 */
function zoneMultiplier(fromCountry: string, toCountry: string): number {
  if (fromCountry === toCountry) return 0.6; // doméstico
  // Mesmas regiões geográficas — agrupamento simples
  const americas = new Set(['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE']);
  const europe = new Set(['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'IE', 'BE', 'AT', 'CH']);
  const asia = new Set(['JP', 'KR', 'CN', 'SG', 'HK', 'TW', 'TH', 'IN', 'AU']);

  const sameRegion = (
    (americas.has(fromCountry) && americas.has(toCountry)) ||
    (europe.has(fromCountry) && europe.has(toCountry)) ||
    (asia.has(fromCountry) && asia.has(toCountry))
  );
  return sameRegion ? 1.0 : 1.6;
}

function mockQuote(
  carrier: ShippingCarrier,
  service: string,
  baseCents: number,
  perKgCents: number,
  daysMin: number,
  daysMax: number,
  input: ShippingRateInput,
): ShippingQuote {
  const kg = Math.max(0.1, input.weightG / 1000);
  const zone = zoneMultiplier(input.fromCountry, input.toCountry);
  const amountCents = Math.round((baseCents + perKgCents * kg) * zone);
  return {
    carrier,
    service,
    amountCents,
    currency: input.currency,
    deliveryDaysMin: daysMin,
    deliveryDaysMax: daysMax,
    source: 'mock',
  };
}

/**
 * Carrier presets — mocks calibrados pra ordem de grandeza realista
 * (DHL Express > FedEx Priority > FedEx Economy > Correios Intl).
 */
export function getMockShippingQuotes(input: ShippingRateInput): ShippingQuote[] {
  return [
    mockQuote('dhl', 'Express Worldwide', 2500, 1500, 2, 4, input),
    mockQuote('fedex', 'International Priority', 2300, 1400, 2, 5, input),
    mockQuote('fedex', 'International Economy', 1500, 900, 5, 9, input),
    mockQuote('correios_intl', 'Pacote Internacional', 800, 600, 10, 25, input),
  ];
}

/**
 * Fetch DHL real (POST /mydhlapi/rates). Sem DHL_API_KEY: retorna [].
 */
export async function fetchDhlQuotes(input: ShippingRateInput): Promise<ShippingQuote[]> {
  const token = process.env.DHL_API_KEY;
  if (!token) return [];
  try {
    // V2: chamada real à DHL MyDHL API. Stub no-op por enquanto.
    logger.info({ carrier: 'dhl', toCountry: input.toCountry }, 'dhl rate request stub');
    return [];
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'dhl rate fetch failed');
    return [];
  }
}

/**
 * Fetch FedEx real. Sem FEDEX_API_KEY: retorna [].
 */
export async function fetchFedexQuotes(input: ShippingRateInput): Promise<ShippingQuote[]> {
  const token = process.env.FEDEX_API_KEY;
  if (!token) return [];
  try {
    logger.info({ carrier: 'fedex', toCountry: input.toCountry }, 'fedex rate request stub');
    return [];
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'fedex rate fetch failed');
    return [];
  }
}

/**
 * Quotes consolidados — chama DHL + FedEx real, fallback mock se ambos vazios.
 * Sempre retorna >= 1 opção (mock), pra cliente nunca ficar sem frete.
 */
export async function getInternationalShippingQuotes(input: ShippingRateInput): Promise<ShippingQuote[]> {
  const [dhl, fedex] = await Promise.all([fetchDhlQuotes(input), fetchFedexQuotes(input)]);
  const real = [...dhl, ...fedex];
  if (real.length > 0) return real;
  return getMockShippingQuotes(input);
}

export function isAnyShippingCarrierConfigured(): boolean {
  return Boolean(process.env.DHL_API_KEY || process.env.FEDEX_API_KEY);
}
