import { inArray } from 'drizzle-orm';
import { db } from './client';
import {
  tenants,
  users,
  products,
  productVariants,
  productImages,
  collections,
  productCollections,
  inventoryLocations,
  inventoryStock,
} from './schema/index';

async function main() {
  console.warn('→ Seed inicial...');

  const tenantId = '00000000-0000-0000-0000-000000000001';

  await db
    .insert(tenants)
    .values({
      id: tenantId,
      slug: 'joias-lab',
      name: 'Joias Lab',
      templateId: 'jewelry-v1',
      domain: 'joias.localhost',
      config: { currency: 'BRL', locale: 'pt-BR' },
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      tenantId,
      email: 'admin@lojeo.dev',
      name: 'Admin Lojeo',
      role: 'admin',
      emailVerified: new Date(),
    })
    .onConflictDoNothing();

  // ── Inventory Location ────────────────────────────────────────────────────
  const locationId = crypto.randomUUID();
  await db
    .insert(inventoryLocations)
    .values({
      id: locationId,
      tenantId,
      name: 'Depósito Principal',
      code: 'MAIN',
      isPrimary: true,
      countryCode: 'BR',
    })
    .onConflictDoNothing();

  // Recuperar locationId real (pode já existir por idempotência)
  const existingLocation = await db.query.inventoryLocations.findFirst({
    where: (loc, { and, eq }) => and(eq(loc.tenantId, tenantId), eq(loc.code, 'MAIN')),
  });
  const finalLocationId = existingLocation?.id ?? locationId;

  // ── Produto 1: Anel Solitário Prata ───────────────────────────────────────
  const anelId = crypto.randomUUID();
  await db
    .insert(products)
    .values({
      id: anelId,
      tenantId,
      slug: 'anel-solitario-prata',
      name: 'Anel Solitário Prata',
      description: 'Anel solitário em prata 925 com zircônia lapidada.',
      sku: 'ANEL-SOL-PRATA-001',
      status: 'active',
      priceCents: 28900,
      comparePriceCents: 35000,
      costCents: 9000,
      currency: 'BRL',
      weightGrams: 5,
      warrantyMonths: 12,
      customFields: {
        material: 'Prata 925',
        pedra: 'Zircônia',
        quilate: '0.5ct',
        tamanho: 'P/M/G',
        aro: '16',
      },
      seoTitle: 'Anel Solitário Prata 925 com Zircônia',
      seoDescription: 'Anel solitário em prata 925 com zircônia lapidada. Elegante e sofisticado.',
    })
    .onConflictDoNothing();

  // ── Produto 2: Brinco Argola Ouro 18k ─────────────────────────────────────
  const brincoId = crypto.randomUUID();
  await db
    .insert(products)
    .values({
      id: brincoId,
      tenantId,
      slug: 'brinco-argola-ouro',
      name: 'Brinco Argola Ouro 18k',
      description: 'Brinco argola em ouro 18k com acabamento polido.',
      sku: 'BRINCO-ARG-OURO-001',
      status: 'active',
      priceCents: 45000,
      comparePriceCents: 55000,
      costCents: 18000,
      currency: 'BRL',
      weightGrams: 4,
      warrantyMonths: 12,
      customFields: {
        material: 'Ouro 18k',
        pedra: null,
        quilate: null,
        tamanho: 'Único',
        aro: null,
      },
      seoTitle: 'Brinco Argola Ouro 18k',
      seoDescription: 'Brinco argola em ouro 18k com acabamento polido. Sofisticação e elegância.',
    })
    .onConflictDoNothing();

  // ── Produto 3: Colar Pingente Coração ─────────────────────────────────────
  const colarId = crypto.randomUUID();
  await db
    .insert(products)
    .values({
      id: colarId,
      tenantId,
      slug: 'colar-pingente-coracao',
      name: 'Colar Pingente Coração',
      description: 'Colar delicado com pingente de coração em prata 925.',
      sku: 'COLAR-PING-COR-001',
      status: 'active',
      priceCents: 12900,
      comparePriceCents: 18000,
      costCents: 4500,
      currency: 'BRL',
      weightGrams: 6,
      warrantyMonths: 12,
      customFields: {
        material: 'Prata 925',
        pedra: 'Zircônia',
        quilate: '0.2ct',
        tamanho: '45cm/50cm',
        aro: null,
      },
      seoTitle: 'Colar Pingente Coração Prata 925',
      seoDescription: 'Colar delicado com pingente de coração em prata 925. Perfeito para presentear.',
    })
    .onConflictDoNothing();

  // ── Variantes ─────────────────────────────────────────────────────────────
  // Anel: tamanho 16 e 18
  const anelVar16Id = crypto.randomUUID();
  const anelVar18Id = crypto.randomUUID();
  await db
    .insert(productVariants)
    .values([
      {
        id: anelVar16Id,
        tenantId,
        productId: anelId,
        sku: 'ANEL-SOL-PRATA-T16',
        optionValues: { tamanho: '16' },
        stockQty: 10,
        priceCents: 28900,
      },
      {
        id: anelVar18Id,
        tenantId,
        productId: anelId,
        sku: 'ANEL-SOL-PRATA-T18',
        optionValues: { tamanho: '18' },
        stockQty: 10,
        priceCents: 28900,
      },
    ])
    .onConflictDoNothing();

  // Brinco: cor Ouro
  const brincoVarId = crypto.randomUUID();
  await db
    .insert(productVariants)
    .values({
      id: brincoVarId,
      tenantId,
      productId: brincoId,
      sku: 'BRINCO-ARG-OURO-UNICO',
      optionValues: { cor: 'Ouro' },
      stockQty: 10,
      priceCents: 45000,
    })
    .onConflictDoNothing();

  // Colar: tamanho 45cm e 50cm
  const colarVar45Id = crypto.randomUUID();
  const colarVar50Id = crypto.randomUUID();
  await db
    .insert(productVariants)
    .values([
      {
        id: colarVar45Id,
        tenantId,
        productId: colarId,
        sku: 'COLAR-PING-COR-45CM',
        optionValues: { tamanho: '45cm' },
        stockQty: 10,
        priceCents: 12900,
      },
      {
        id: colarVar50Id,
        tenantId,
        productId: colarId,
        sku: 'COLAR-PING-COR-50CM',
        optionValues: { tamanho: '50cm' },
        stockQty: 10,
        priceCents: 12900,
      },
    ])
    .onConflictDoNothing();

  // ── Collections ────────────────────────────────────────────────────────────
  const colAnéisId = crypto.randomUUID();
  const colDestaquesId = crypto.randomUUID();
  await db
    .insert(collections)
    .values([
      {
        id: colAnéisId,
        tenantId,
        slug: 'aneis',
        name: 'Anéis',
        description: 'Nossa coleção de anéis artesanais.',
      },
      {
        id: colDestaquesId,
        tenantId,
        slug: 'destaques',
        name: 'Destaques',
        description: 'Peças em destaque da temporada.',
      },
    ])
    .onConflictDoNothing();

  // Recuperar IDs reais das collections (idempotência)
  const [existingAneis, existingDestaques] = await Promise.all([
    db.query.collections.findFirst({
      where: (c, { and, eq }) => and(eq(c.tenantId, tenantId), eq(c.slug, 'aneis')),
    }),
    db.query.collections.findFirst({
      where: (c, { and, eq }) => and(eq(c.tenantId, tenantId), eq(c.slug, 'destaques')),
    }),
  ]);
  const finalAnéisId = existingAneis?.id ?? colAnéisId;
  const finalDestaquesId = existingDestaques?.id ?? colDestaquesId;

  // Recuperar IDs reais dos produtos (idempotência)
  const [existingAnel, existingBrinco, existingColar] = await Promise.all([
    db.query.products.findFirst({
      where: (p, { and, eq }) => and(eq(p.tenantId, tenantId), eq(p.slug, 'anel-solitario-prata')),
    }),
    db.query.products.findFirst({
      where: (p, { and, eq }) => and(eq(p.tenantId, tenantId), eq(p.slug, 'brinco-argola-ouro')),
    }),
    db.query.products.findFirst({
      where: (p, { and, eq }) => and(eq(p.tenantId, tenantId), eq(p.slug, 'colar-pingente-coracao')),
    }),
  ]);
  const finalAnelId = existingAnel?.id ?? anelId;
  const finalBrincoId = existingBrinco?.id ?? brincoId;
  const finalColarId = existingColar?.id ?? colarId;

  // ── Imagens (delete+insert para idempotência — sem uniqueIndex) ───────────
  await db
    .delete(productImages)
    .where(inArray(productImages.productId, [finalAnelId, finalBrincoId, finalColarId]));
  await db.insert(productImages).values([
    {
      tenantId,
      productId: finalAnelId,
      url: 'https://placehold.co/800x800/f5f0eb/1a1a1a?text=Anel+Solitario',
      altText: 'Anel Solitário Prata 925',
      position: 0,
    },
    {
      tenantId,
      productId: finalBrincoId,
      url: 'https://placehold.co/800x800/f5f0eb/1a1a1a?text=Brinco+Argola',
      altText: 'Brinco Argola Ouro 18k',
      position: 0,
    },
    {
      tenantId,
      productId: finalColarId,
      url: 'https://placehold.co/800x800/f5f0eb/1a1a1a?text=Colar+Pingente',
      altText: 'Colar Pingente Coração',
      position: 0,
    },
  ]);

  // Vínculos produto ↔ collection (delete+insert para idempotência — sem uniqueIndex)
  await db
    .delete(productCollections)
    .where(inArray(productCollections.productId, [finalAnelId, finalBrincoId, finalColarId]));
  await db.insert(productCollections).values([
    // Anel → Anéis
    { productId: finalAnelId, collectionId: finalAnéisId, position: 0 },
    // Todos → Destaques
    { productId: finalAnelId, collectionId: finalDestaquesId, position: 0 },
    { productId: finalBrincoId, collectionId: finalDestaquesId, position: 1 },
    { productId: finalColarId, collectionId: finalDestaquesId, position: 2 },
  ]);

  // ── Inventory Stock ────────────────────────────────────────────────────────
  // Recuperar IDs reais das variantes (idempotência)
  const [existingAnelVar16, existingAnelVar18, existingBrincoVar, existingColarVar45, existingColarVar50] =
    await Promise.all([
      db.query.productVariants.findFirst({
        where: (v, { and, eq }) => and(eq(v.tenantId, tenantId), eq(v.sku, 'ANEL-SOL-PRATA-T16')),
      }),
      db.query.productVariants.findFirst({
        where: (v, { and, eq }) => and(eq(v.tenantId, tenantId), eq(v.sku, 'ANEL-SOL-PRATA-T18')),
      }),
      db.query.productVariants.findFirst({
        where: (v, { and, eq }) => and(eq(v.tenantId, tenantId), eq(v.sku, 'BRINCO-ARG-OURO-UNICO')),
      }),
      db.query.productVariants.findFirst({
        where: (v, { and, eq }) => and(eq(v.tenantId, tenantId), eq(v.sku, 'COLAR-PING-COR-45CM')),
      }),
      db.query.productVariants.findFirst({
        where: (v, { and, eq }) => and(eq(v.tenantId, tenantId), eq(v.sku, 'COLAR-PING-COR-50CM')),
      }),
    ]);

  const variantIds = [
    existingAnelVar16?.id ?? anelVar16Id,
    existingAnelVar18?.id ?? anelVar18Id,
    existingBrincoVar?.id ?? brincoVarId,
    existingColarVar45?.id ?? colarVar45Id,
    existingColarVar50?.id ?? colarVar50Id,
  ];

  await db
    .insert(inventoryStock)
    .values(
      variantIds.map((variantId) => ({
        tenantId,
        locationId: finalLocationId,
        variantId,
        qty: 10,
        reserved: 0,
        lowStockThreshold: 2,
      })),
    )
    .onConflictDoNothing();

  console.warn('✓ Seed pronto:');
  console.warn('  - tenant joias-lab + admin@lojeo.dev');
  console.warn('  - inventoryLocation: Depósito Principal (MAIN)');
  console.warn('  - 3 produtos: anel-solitario-prata, brinco-argola-ouro, colar-pingente-coracao');
  console.warn('  - 5 variantes com stockQty 10 cada');
  console.warn('  - 3 imagens placeholder');
  console.warn('  - 2 collections: aneis, destaques');
  console.warn('  - 4 vínculos produto↔collection');
  console.warn('  - 5 registros inventoryStock (qty=10, reserved=0, threshold=2)');

  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Seed falhou:', err);
  process.exit(1);
});
