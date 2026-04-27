import { describe, expect, it } from 'vitest';
import { slugifyTitle, BLOG_POST_STATUSES } from './blog';

describe('slugifyTitle', () => {
  it('lowercase + hifeniza palavras', () => {
    expect(slugifyTitle('Como Cuidar de Joias')).toBe('como-cuidar-de-joias');
  });

  it('remove acentos preservando letra', () => {
    expect(slugifyTitle('Ações & Práticas')).toBe('acoes-praticas');
  });

  it('coalesce hifens duplos e remove bordas', () => {
    expect(slugifyTitle('  ---ola---mundo--- ')).toBe('ola-mundo');
  });

  it('limita 200 chars', () => {
    const longTitle = 'a'.repeat(300);
    expect(slugifyTitle(longTitle).length).toBe(200);
  });

  it('fallback "post" para entrada sem alfa-num', () => {
    expect(slugifyTitle('---')).toBe('post');
    expect(slugifyTitle('   ')).toBe('post');
  });

  it('preserva números', () => {
    expect(slugifyTitle('Top 10 anéis 2026')).toBe('top-10-aneis-2026');
  });
});

describe('BLOG_POST_STATUSES', () => {
  it('inclui draft e published', () => {
    expect(BLOG_POST_STATUSES).toEqual(['draft', 'published']);
  });
});
