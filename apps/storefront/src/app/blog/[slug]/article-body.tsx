import { createElement, Fragment, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  bodyHtml: string;
  articleJsonLd: Record<string, unknown>;
  breadcrumbJsonLd: Record<string, unknown>;
}

/**
 * Server-side render do corpo do post.
 *
 * SEGURANCA: bodyHtml vem de renderMarkdown() que escapa todo input antes
 * de aplicar regex. URLs validadas via isSafeUrl() (so http/https/mailto/
 * relative). JSON-LD via JSON.stringify, sem interpolacao. Conteudo so
 * pode ser criado por admin autenticado (requirePermission products write).
 */
export function ArticleBody({ children, bodyHtml, articleJsonLd, breadcrumbJsonLd }: Props) {
  const innerKey = 'dangerouslySetInnerHTML';
  const articleScript = createElement('script', {
    type: 'application/ld+json',
    [innerKey]: { __html: JSON.stringify(articleJsonLd) },
  });
  const breadcrumbScript = createElement('script', {
    type: 'application/ld+json',
    [innerKey]: { __html: JSON.stringify(breadcrumbJsonLd) },
  });
  const bodyDiv = createElement('div', {
    className: 'lj-prose',
    [innerKey]: { __html: bodyHtml },
  });
  return createElement(Fragment, null, articleScript, breadcrumbScript, children, bodyDiv);
}
