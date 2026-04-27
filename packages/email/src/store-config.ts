// Configuração shared usada por storefront e admin pra enviar emails.
//
// Lida com env vars centralmente — apps consumidoras importam constantes em vez de re-derivar.

export type EmailLocale = 'pt-BR' | 'en-US';

export interface StoreEmailConfig {
  storeName: string;
  fromEmail: string;
  storefrontBase: string;
  locale: EmailLocale;
  currency: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CAD';
}

export function getStoreEmailConfig(): StoreEmailConfig {
  const locale = (process.env.STOREFRONT_LOCALE as EmailLocale | undefined) ?? 'pt-BR';
  const currency = (process.env.STOREFRONT_CURRENCY as StoreEmailConfig['currency'] | undefined) ?? 'BRL';
  return {
    storeName: process.env.STOREFRONT_STORE_NAME ?? 'Atelier',
    fromEmail: process.env.STOREFRONT_FROM_EMAIL ?? 'no-reply@lojeo.app',
    storefrontBase: process.env.STOREFRONT_PUBLIC_URL ?? 'https://lojeo.app',
    locale: locale === 'en-US' ? 'en-US' : 'pt-BR',
    currency,
  };
}

/**
 * Helper centralizado pra subjects bilingues. Não inclui interpolação —
 * caller faz o template literal final (ex: `${subj.orderConfirmed} · ${code}`).
 */
export function emailSubjects(locale: EmailLocale) {
  if (locale === 'en-US') {
    return {
      orderConfirmed: 'Order confirmed',
      welcome: 'Welcome to',
      pixGenerated: 'Your Pix',
      boletoGenerated: 'Your boleto',
      shippingNotification: 'Your order has shipped',
      tradeApproved: 'Approved',
      recoverCart: 'Your cart is waiting',
    } as const;
  }
  return {
    orderConfirmed: 'Pedido confirmado',
    welcome: 'Bem-vinda à',
    pixGenerated: 'Seu Pix',
    boletoGenerated: 'Seu boleto',
    shippingNotification: 'Seu pedido foi enviado',
    tradeApproved: 'Aprovada',
    recoverCart: 'Seu carrinho está esperando',
  } as const;
}
