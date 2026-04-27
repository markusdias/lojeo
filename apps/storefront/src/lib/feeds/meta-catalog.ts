// Meta Catalog feed builder — CSV format compatível com Facebook Catalog
// Manager bulk import.
// Doc: https://www.facebook.com/business/help/120325381656392
//
// Required: id, title, description, availability, condition, price, link, image_link, brand.
// Returns CSV string com header line + rows escapadas.

export interface MetaCatalogItemInput {
  id: string;
  title: string;
  description: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  condition: 'new' | 'refurbished' | 'used';
  priceCents: number;
  currency: string;
  link: string;
  imageLink: string;
  brand: string;
  productType?: string;
  gtin?: string;
}

export interface MetaCatalogFeedInput {
  items: MetaCatalogItemInput[];
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtPrice(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function buildMetaCatalogFeedCsv(input: MetaCatalogFeedInput): string {
  const headers = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
    'product_type',
    'gtin',
  ];
  const rows = input.items.map((it) =>
    [
      it.id,
      it.title,
      it.description,
      it.availability,
      it.condition,
      fmtPrice(it.priceCents, it.currency),
      it.link,
      it.imageLink,
      it.brand,
      it.productType ?? '',
      it.gtin ?? '',
    ]
      .map(csvEscape)
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}
