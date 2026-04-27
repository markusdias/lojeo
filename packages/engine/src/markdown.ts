/**
 * Markdown renderer minimo, server-side, zero deps.
 *
 * Suporta:
 *   ## H2, ### H3
 *   paragrafos
 *   listas - item
 *   **negrito**, *italico*
 *   [link](url) com URL HTTPS allowlist
 *
 * Escape HTML por padrao. Nao suporta tabelas, code blocks, imagens inline.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:';
  } catch {
    return u.startsWith('/');
  }
}

function renderInline(line: string): string {
  let out = escapeHtml(line);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) => {
    if (!isSafeUrl(url)) return text;
    return `<a href="${escapeHtml(url)}" rel="noopener">${text}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|\W)\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    out.push(`<p>${renderInline(paragraph.join(' ').trim())}</p>`);
    paragraph = [];
  }
  function flushList() {
    if (listItems.length === 0) return;
    out.push(`<ul>${listItems.map((i) => `<li>${renderInline(i)}</li>`).join('')}</ul>`);
    listItems = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3 && h3[1]) {
      flushParagraph();
      flushList();
      out.push(`<h3>${renderInline(h3[1])}</h3>`);
      continue;
    }
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2 && h2[1]) {
      flushParagraph();
      flushList();
      out.push(`<h2>${renderInline(h2[1])}</h2>`);
      continue;
    }
    const li = /^[-*]\s+(.+)$/.exec(line);
    if (li && li[1]) {
      flushParagraph();
      listItems.push(li[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return out.join('\n');
}
