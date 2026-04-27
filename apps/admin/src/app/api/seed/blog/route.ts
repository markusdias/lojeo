import { NextRequest, NextResponse } from 'next/server';
import { eq, and, like } from 'drizzle-orm';
import { db, blogPosts } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

const SEED_AUTHOR = 'Atelier · seed';

const SEED_POSTS = [
  {
    slug: 'cuidados-prata-925',
    title: 'Como cuidar de joias em prata 925 sem perder o brilho',
    excerpt:
      'Hábitos simples preservam o lustro da prata por anos — e evitam que o sulfeto natural do ar opaque a peça.',
    body: `## Por que a prata escurece

A prata 925 contém 7,5% de cobre que reage com enxofre presente no ar e em alguns cosméticos. Essa reação cria sulfeto de prata, uma camada superficial escura. Não é defeito — é química.

## Rotina diária

- Coloque a joia **depois** de aplicar perfume, hidratante e maquiagem
- Tire ao dormir, ao tomar banho e ao malhar
- Guarde em saquinho de tecido individual (oxida menos que junto com outras peças)

## Limpeza a cada 30-60 dias

Use flanela específica para prata ou pasta de bicarbonato + água, esfregando levemente com escova de cerdas macias. Enxágue com água morna e seque imediatamente com pano seco.

### Quando levar ao ateliê

Se a peça tem cravação de pedras ou banhos especiais (ouro, ródio), evite produtos abrasivos em casa. Uma manutenção profissional anual mantém a peça como nova.`,
    coverImageUrl: null as string | null,
  },
  {
    slug: 'guia-anel-noivado',
    title: 'Guia honesto para escolher um anel de noivado',
    excerpt:
      'Antes de pensar em quilate ou pedra, vale entender três coisas: estilo de uso, dia a dia da pessoa e tamanho real.',
    body: `## Comece pelo estilo de uso, não pela pedra

Um anel é uma joia que vai ser usada todos os dias. Se a pessoa lava louça sem luva, trabalha com computador, faz exercício — o desenho importa mais que o brilho. Solitários altos arranham; aros baixos não.

## Tamanho de aro real

Três opções para acertar sem revelar:

- Pegue um anel emprestado e meça o diâmetro interno em mm
- Use um aplicativo confiável de medição
- Encomende um aro provisório e troque depois

A maioria das mulheres no Brasil usa entre 14 e 17. Homens, entre 19 e 22.

## Pedras: o que muda na prática

### Diamante natural

Mais duro entre as gemas (Mohs 10), risca apenas com outro diamante. Caro. Cor D-F e clareza VS1+ são o ponto de equilíbrio entre beleza e custo.

### Moissanita

Brilho similar (índice de refração maior, na verdade), 80% mais barata. Mohs 9,25 — risca raramente no uso diário.

### Safira branca

Opção sustentável, Mohs 9. Brilho mais sutil, prata leitosa em vez de fogo branco do diamante. Combina com peças minimalistas.

## O que perguntar ao joalheiro

- Origem do material (rastreabilidade)
- Garantia (mínimo 1 ano para defeito de fabricação)
- Política de troca de aro (deve ser gratuita nos primeiros 60 dias)
- Política de resgate em troca de upgrade futuro`,
    coverImageUrl: null as string | null,
  },
];

export async function POST(_req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  for (const seed of SEED_POSTS) {
    try {
      const [row] = await db
        .insert(blogPosts)
        .values({
          tenantId: TENANT_ID,
          slug: seed.slug,
          title: seed.title,
          excerpt: seed.excerpt,
          body: seed.body,
          coverImageUrl: seed.coverImageUrl,
          status: 'published',
          authorName: SEED_AUTHOR,
          publishedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ slug: blogPosts.slug });
      if (row) created.push(row.slug);
      else skipped.push(seed.slug);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      skipped.push(`${seed.slug}: ${msg}`);
    }
  }
  return NextResponse.json({ ok: true, created, skipped });
}

export async function DELETE() {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const del = await db
    .delete(blogPosts)
    .where(and(eq(blogPosts.tenantId, TENANT_ID), like(blogPosts.authorName, 'Atelier · seed%')))
    .returning({ id: blogPosts.id });
  return NextResponse.json({ ok: true, deleted: del.length });
}
