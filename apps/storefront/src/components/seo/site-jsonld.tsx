import { createElement, Fragment } from 'react';

interface Props {
  baseUrl: string;
  storeName: string;
  description?: string;
  logoUrl?: string;
}

/**
 * Organization + WebSite JSON-LD pro storefront, injetado no root layout.
 *
 * - Organization: marca da loja (do template ativo, nao do produto SaaS Lojeo)
 * - WebSite: habilita sitelinks searchbox no Google via /busca?q=...
 *
 * SEGURANCA: serializado via JSON.stringify, sem interpolacao de string.
 */
export function SiteJsonLd({ baseUrl, storeName, description, logoUrl }: Props) {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: storeName,
    url: baseUrl,
    description,
    logo: logoUrl,
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: storeName,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/busca?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
  const innerKey = 'dangerouslySetInnerHTML';
  const orgScript = createElement('script', {
    type: 'application/ld+json',
    [innerKey]: { __html: JSON.stringify(organization) },
  });
  const siteScript = createElement('script', {
    type: 'application/ld+json',
    [innerKey]: { __html: JSON.stringify(website) },
  });
  return createElement(Fragment, null, orgScript, siteScript);
}
