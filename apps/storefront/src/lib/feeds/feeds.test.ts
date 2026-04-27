import { describe, it, expect } from 'vitest';
import { buildGoogleShoppingFeedXml } from './google-shopping';
import { buildMetaCatalogFeedCsv } from './meta-catalog';

const sampleProduct = {
  id: 'sku-001',
  title: 'Anel "Solitário"',
  description: 'Anel ouro 18k, brilhante 0.10ct.',
  link: 'https://shop.com/produtos/anel-solitario',
  imageLink: 'https://cdn.shop.com/p1.jpg',
  priceCents: 289000,
  currency: 'BRL',
  availability: 'in stock' as const,
  brand: 'Atelier',
  condition: 'new' as const,
  productType: 'Joias > Anéis',
  warrantyMonths: 12,
  shippingWeightG: 50,
};

describe('buildGoogleShoppingFeedXml', () => {
  it('gera XML 2.0 RSS válido com namespace g', () => {
    const xml = buildGoogleShoppingFeedXml({
      storeName: 'Atelier',
      storeUrl: 'https://shop.com',
      items: [sampleProduct],
    });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain('<title>Atelier</title>');
    expect(xml).toContain('<g:id>sku-001</g:id>');
    expect(xml).toContain('<g:price>2890.00 BRL</g:price>');
    expect(xml).toContain('<g:availability>in stock</g:availability>');
  });

  it('escapa entidades XML em title (& < > " \\\')', () => {
    const xml = buildGoogleShoppingFeedXml({
      storeName: 'Atelier & Co',
      storeUrl: 'https://shop.com',
      items: [{ ...sampleProduct, title: '<Anel> "Special" & Co' }],
    });
    expect(xml).toContain('Atelier &amp; Co');
    expect(xml).toContain('&lt;Anel&gt;');
    expect(xml).toContain('&quot;Special&quot;');
  });

  it('omite campos opcionais quando null/undefined', () => {
    const xml = buildGoogleShoppingFeedXml({
      storeName: 'X',
      storeUrl: 'https://shop.com',
      items: [{ ...sampleProduct, description: null, imageLink: null, brand: undefined, gtin: undefined }],
    });
    expect(xml).not.toContain('<g:description>');
    expect(xml).not.toContain('<g:image_link>');
    expect(xml).not.toContain('<g:brand>');
  });

  it('shipping_weight em kg formatado', () => {
    const xml = buildGoogleShoppingFeedXml({
      storeName: 'X',
      storeUrl: 'https://shop.com',
      items: [{ ...sampleProduct, shippingWeightG: 1500 }],
    });
    expect(xml).toContain('<g:shipping_weight>1.50 kg</g:shipping_weight>');
  });
});

describe('buildMetaCatalogFeedCsv', () => {
  it('gera header + linha rows separadas por \\n', () => {
    const csv = buildMetaCatalogFeedCsv({
      items: [
        {
          id: 'p1',
          title: 'Anel',
          description: 'Lindo anel',
          availability: 'in stock',
          condition: 'new',
          priceCents: 12000,
          currency: 'BRL',
          link: 'https://shop.com/p1',
          imageLink: 'https://cdn.shop.com/p1.jpg',
          brand: 'Atelier',
        },
      ],
    });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,title,description,availability,condition,price,link,image_link,brand,product_type,gtin');
    expect(lines[1]).toContain('p1,Anel,Lindo anel,in stock,new,120.00 BRL');
  });

  it('escapa CSV (vírgula + aspas)', () => {
    const csv = buildMetaCatalogFeedCsv({
      items: [
        {
          id: 'p1',
          title: 'Anel, ouro',
          description: 'Brilhante "VVS" qualidade',
          availability: 'in stock',
          condition: 'new',
          priceCents: 12000,
          currency: 'USD',
          link: 'https://shop.com/p1',
          imageLink: 'https://cdn.shop.com/p1.jpg',
          brand: 'Atelier',
        },
      ],
    });
    expect(csv).toContain('"Anel, ouro"');
    expect(csv).toContain('"Brilhante ""VVS"" qualidade"');
  });

  it('retorna apenas header quando sem items', () => {
    const csv = buildMetaCatalogFeedCsv({ items: [] });
    expect(csv.split('\n')).toHaveLength(1);
  });
});
