// Shipping options builder — consolidated BR (Correios/Jadlog) + intl (DHL/FedEx).
//
// Helper puro testavel — recebe pais + subtotal + cep, retorna ShippingOption[].
// Para BR usa tabela mock domestica; para intl chama getInternationalShippingQuotes.

import type { ShippingOption } from '../../components/checkout/checkout-provider';
import { getInternationalShippingQuotes, type ShippingQuote } from './international';

export interface BuildShippingOptionsInput {
  country: string;            // ISO-2 ('BR', 'US', 'GB', etc.)
  postalCode: string;
  subtotalCents: number;
  currency: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CAD';
  weightG?: number;            // peso estimado total carrinho — default 500g
}

const FREE_SHIPPING_ABOVE = 50000; // 500.00 BRL

/**
 * Mock BR — Correios/Jadlog baseado em CEP region.
 * Mantém parity com lógica histórica de getShippingOptions em frete/page.tsx.
 */
function buildBRShippingOptions(input: BuildShippingOptionsInput): ShippingOption[] {
  const state = input.postalCode.slice(0, 5);
  const isSP = state >= '01000' && state <= '19999';
  const base = isSP ? 1200 : 2400;
  const free = input.subtotalCents >= FREE_SHIPPING_ABOVE;

  return [
    {
      id: 'correios-pac',
      carrier: 'Correios',
      service: 'PAC',
      deadlineDays: isSP ? 5 : 10,
      priceCents: free ? 0 : base,
      label: `Correios PAC — até ${isSP ? 5 : 10} dias úteis`,
    },
    {
      id: 'correios-sedex',
      carrier: 'Correios',
      service: 'SEDEX',
      deadlineDays: isSP ? 2 : 4,
      priceCents: free ? 0 : Math.round(base * 2.2),
      label: `Correios SEDEX — até ${isSP ? 2 : 4} dias úteis`,
    },
    {
      id: 'jadlog-package',
      carrier: 'Jadlog',
      service: 'Package',
      deadlineDays: isSP ? 3 : 7,
      priceCents: free ? 0 : Math.round(base * 1.5),
      label: `Jadlog Package — até ${isSP ? 3 : 7} dias úteis`,
    },
  ];
}

/**
 * Converte ShippingQuote (international) em ShippingOption (checkout-provider format).
 */
export function quoteToOption(q: ShippingQuote): ShippingOption {
  const carrierLabel = q.carrier === 'dhl' ? 'DHL' : q.carrier === 'fedex' ? 'FedEx' : 'Correios Intl';
  return {
    id: `${q.carrier}-${q.service.toLowerCase().replace(/\s+/g, '-')}`,
    carrier: carrierLabel,
    service: q.service,
    deadlineDays: q.deliveryDaysMax,
    priceCents: q.amountCents,
    label: `${carrierLabel} ${q.service} — ${q.deliveryDaysMin}–${q.deliveryDaysMax} business days`,
  };
}

/**
 * Default fromCountry baseado em currency. coffee-v1 (USD) origem US,
 * jewelry-v1 (BRL) origem BR. V2: persistir em tenant.config.shippingOrigin.
 */
export function defaultFromCountry(currency: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CAD'): string {
  if (currency === 'BRL') return 'BR';
  if (currency === 'USD' || currency === 'CAD') return 'US';
  if (currency === 'GBP') return 'GB';
  if (currency === 'EUR') return 'DE';
  return 'US';
}

/**
 * Default toCountry baseado em currency (cliente comum da loja).
 * Quando endereco nao tem country explicito.
 */
export function defaultToCountry(currency: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CAD'): string {
  return defaultFromCountry(currency);
}

export async function buildShippingOptions(input: BuildShippingOptionsInput): Promise<ShippingOption[]> {
  const country = (input.country || 'BR').toUpperCase();
  if (country === 'BR') {
    return buildBRShippingOptions(input);
  }

  const fromCountry = defaultFromCountry(input.currency);
  const quotes = await getInternationalShippingQuotes({
    fromCountry,
    toCountry: country,
    toPostalCode: input.postalCode,
    weightG: input.weightG ?? 500,
    currency: input.currency === 'GBP' || input.currency === 'CAD' ? 'USD' : input.currency,
  });

  return quotes.map(quoteToOption);
}
