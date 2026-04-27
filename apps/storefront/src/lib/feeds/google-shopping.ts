// Google Shopping feed builder — XML 2.0 (RSS Atom-based) compatível com
// Google Merchant Center.
// Doc: https://support.google.com/merchants/answer/7052112
//
// Helper puro recebe products + tenant config + baseUrl, retorna string XML.

export interface GoogleShoppingItemInput {
  id: string;                      // SKU ou productId
  title: string;
  description: string | null;
  link: string;                    // PDP url absoluto
  imageLink: string | null;
  priceCents: number;
  currency: string;                // ISO 4217
  availability: 'in stock' | 'out of stock' | 'preorder';
  brand?: string;
  condition?: 'new' | 'refurbished' | 'used';
  gtin?: string;
  productType?: string;            // breadcrumb category
  shippingWeightG?: number;
  warrantyMonths?: number | null;
}

export interface GoogleShoppingFeedInput {
  storeName: string;
  storeUrl: string;
  feedDescription?: string;
  items: GoogleShoppingItemInput[];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmtPrice(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export function buildGoogleShoppingFeedXml(input: GoogleShoppingFeedInput): string {
  const items = input.items
    .map((it) => {
      const lines: string[] = [];
      lines.push('<item>');
      lines.push(`<g:id>${escapeXml(it.id)}</g:id>`);
      lines.push(`<g:title>${escapeXml(it.title)}</g:title>`);
      if (it.description) lines.push(`<g:description>${escapeXml(it.description)}</g:description>`);
      lines.push(`<g:link>${escapeXml(it.link)}</g:link>`);
      if (it.imageLink) lines.push(`<g:image_link>${escapeXml(it.imageLink)}</g:image_link>`);
      lines.push(`<g:availability>${it.availability}</g:availability>`);
      lines.push(`<g:price>${fmtPrice(it.priceCents, it.currency)}</g:price>`);
      if (it.condition) lines.push(`<g:condition>${it.condition}</g:condition>`);
      if (it.brand) lines.push(`<g:brand>${escapeXml(it.brand)}</g:brand>`);
      if (it.gtin) lines.push(`<g:gtin>${escapeXml(it.gtin)}</g:gtin>`);
      if (it.productType) lines.push(`<g:product_type>${escapeXml(it.productType)}</g:product_type>`);
      if (it.shippingWeightG) lines.push(`<g:shipping_weight>${(it.shippingWeightG / 1000).toFixed(2)} kg</g:shipping_weight>`);
      if (it.warrantyMonths) lines.push(`<g:warranty_months>${it.warrantyMonths}</g:warranty_months>`);
      lines.push('</item>');
      return lines.join('');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>${escapeXml(input.storeName)}</title>
<link>${escapeXml(input.storeUrl)}</link>
<description>${escapeXml(input.feedDescription ?? `${input.storeName} product feed`)}</description>
${items}
</channel>
</rss>`;
}
