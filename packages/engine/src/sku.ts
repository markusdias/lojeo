export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

export function generateSku(prefix: string, n: number): string {
  const slug = slugify(prefix).toUpperCase().replace(/-/g, '').slice(0, 8);
  return `${slug || 'PROD'}-${String(n).padStart(5, '0')}`;
}
