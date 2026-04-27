// Currency formatter — cents → locale-aware money string.
//
// Suporta as moedas dos templates atuais. V2 expandir conforme novos templates.
// Usa Intl.NumberFormat (universal browser/node).

export type SupportedCurrency = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CAD';
export type SupportedLocale = 'pt-BR' | 'en-US' | 'en-GB' | 'es-ES' | 'fr-FR';

const localeFor: Record<SupportedCurrency, SupportedLocale> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'en-GB', // EUR genérico; loja específica pode override
  GBP: 'en-GB',
  CAD: 'en-US',
};

/**
 * Formata valor em centavos para string localizada.
 * Ex: formatMoney(2776_90, 'BRL') → 'R$ 2.776,90'
 *     formatMoney(2999, 'USD') → '$29.99'
 */
export function formatMoney(cents: number, currency: SupportedCurrency, locale?: SupportedLocale): string {
  const value = cents / 100;
  const useLocale = locale ?? localeFor[currency];
  return new Intl.NumberFormat(useLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function fmtBRL(cents: number): string {
  return formatMoney(cents, 'BRL');
}

export function fmtUSD(cents: number): string {
  return formatMoney(cents, 'USD');
}

/** Mapeia template config currency string para SupportedCurrency type-safe. */
export function asSupportedCurrency(input: string): SupportedCurrency {
  const upper = input.toUpperCase();
  if (upper === 'BRL' || upper === 'USD' || upper === 'EUR' || upper === 'GBP' || upper === 'CAD') {
    return upper;
  }
  return 'BRL'; // fallback default
}
