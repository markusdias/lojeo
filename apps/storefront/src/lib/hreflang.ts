/**
 * hreflang — helper pronto para multi-locale.
 *
 * Hoje (Fase 1.1): template ativo é jewelry-v1 em pt-BR. O mapa contém apenas
 * pt-BR + x-default apontando para a mesma URL — necessário para sinalizar ao
 * Google que esta é a versão padrão e evitar duplicate content quando uma
 * segunda locale entrar.
 *
 * Fase 1.2 (ativação multi-template): quando coffee-v1 EN-US entrar, a função
 * passará a inspecionar o template ativo (ou TENANT config) e produzir o mapa
 * cruzado entre BASE_URL_PT_BR e BASE_URL_EN_US, ambos sob o mesmo path.
 *
 * @see ecommerce-requisitos-v1.3.md sec 12.3 (SEO) e sec 21 (i18n)
 */

const BASE_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';

/**
 * Locales suportados hoje. Quando coffee-v1 entrar, adicionar 'en-US' aqui
 * + mapear ao respectivo base URL via env (ex.: STOREFRONT_URL_EN).
 */
const SUPPORTED_LOCALES = ['pt-BR'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function joinUrl(base: string, path: string): string {
  if (!path || path === '/') return base;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

function baseUrlFor(_locale: SupportedLocale): string {
  // Fase 1.2: switch por locale → STOREFRONT_URL_EN_US etc.
  return BASE_URL;
}

/**
 * Retorna mapa { 'pt-BR': '...', 'x-default': '...' } pronto para
 * `alternates.languages` em Metadata e `alternates.languages` em Sitemap.
 *
 * @param path — caminho relativo (ex.: '/produtos', '/sobre'). Use '/' para a home.
 */
export function getHreflangAlternates(path: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    map[locale] = joinUrl(baseUrlFor(locale), path);
  }
  // x-default: enquanto só existe pt-BR, aponta para ele. Em Fase 1.2 com
  // múltiplas locales, x-default deve ir para uma página de seleção ou para
  // a versão default global (ex.: en-US).
  map['x-default'] = joinUrl(baseUrlFor(SUPPORTED_LOCALES[0]), path);
  return map;
}

/**
 * Retorna o locale principal (primeira entrada não-x-default) — usado como
 * `lang` do <html> e como locale "atual" do Metadata.
 */
export function getPrimaryLocale(): SupportedLocale {
  return SUPPORTED_LOCALES[0];
}
