import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renderiza H2 e H3', () => {
    const html = renderMarkdown('## Título\n\n### Subtítulo');
    expect(html).toContain('<h2>Título</h2>');
    expect(html).toContain('<h3>Subtítulo</h3>');
  });

  it('escapa HTML do input por padrão', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renderiza parágrafos separados por linha em branco', () => {
    const html = renderMarkdown('primeiro parágrafo\n\nsegundo parágrafo');
    expect(html).toContain('<p>primeiro parágrafo</p>');
    expect(html).toContain('<p>segundo parágrafo</p>');
  });

  it('renderiza listas com -', () => {
    const html = renderMarkdown('- item um\n- item dois');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>item um</li>');
    expect(html).toContain('<li>item dois</li>');
  });

  it('renderiza negrito', () => {
    const html = renderMarkdown('isto é **forte**');
    expect(html).toContain('<strong>forte</strong>');
  });

  it('renderiza link com URL https', () => {
    const html = renderMarkdown('veja [aqui](https://exemplo.com)');
    expect(html).toContain('<a href="https://exemplo.com"');
  });

  it('rejeita URL javascript:', () => {
    const html = renderMarkdown('clique [aqui](javascript:alert(1))');
    expect(html).not.toContain('href="javascript:');
    // texto do link mantido como fallback
    expect(html).toContain('aqui');
  });

  it('aceita URL relativa /blog/x', () => {
    const html = renderMarkdown('vá [pra cá](/blog/post)');
    expect(html).toContain('href="/blog/post"');
  });

  it('separa H2 e parágrafo seguinte', () => {
    const html = renderMarkdown('## Cabeça\nparágrafo abaixo');
    expect(html).toContain('<h2>Cabeça</h2>');
    expect(html).toContain('<p>parágrafo abaixo</p>');
  });
});
