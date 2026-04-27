// Configuração shared usada por storefront e admin pra enviar emails.
//
// Lida com env vars centralmente — apps consumidoras importam constantes em vez de re-derivar.

export interface StoreEmailConfig {
  storeName: string;
  fromEmail: string;
  storefrontBase: string;
}

export function getStoreEmailConfig(): StoreEmailConfig {
  return {
    storeName: process.env.STOREFRONT_STORE_NAME ?? 'Atelier',
    fromEmail: process.env.STOREFRONT_FROM_EMAIL ?? 'no-reply@lojeo.app',
    storefrontBase: process.env.STOREFRONT_PUBLIC_URL ?? 'https://lojeo.app',
  };
}
