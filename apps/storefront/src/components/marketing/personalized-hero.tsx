import { db, orders } from '@lojeo/db';
import { eq, and, not, sql } from 'drizzle-orm';
import { scoreCustomers } from '@lojeo/engine';
import { auth } from '../../auth';
import { HeroExperiment } from './hero-experiment';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface HeroCta {
  label: string;
  href: string;
}

interface PersonalizedHeroProps {
  defaultHeadline: string;
  defaultSubheadline: string;
  defaultCta: HeroCta;
}

interface SegmentCopy {
  headline: string;
  subheadline: string;
  cta: HeroCta;
}

/**
 * Cópia personalizada do hero por segmento RFM.
 * Mantém tom editorial do template jewelry-v1, varia mensagem por contexto.
 */
const SEGMENT_COPY: Record<string, SegmentCopy> = {
  champions: {
    headline: 'De volta ao ateliê.',
    subheadline: 'Suas peças mais recentes inspiraram novas criações. Veja primeiro o que ainda nem entrou na coleção pública.',
    cta: { label: 'Ver novidades exclusivas', href: '/produtos?ordenar=novidades' },
  },
  loyal: {
    headline: 'Bem-vinda de volta.',
    subheadline: 'Continue a coleção com peças que combinam com o que você já tem. Ouro 18k e prata 925, finalizadas à mão.',
    cta: { label: 'Ver para você', href: '#para-voce' },
  },
  at_risk: {
    headline: 'Sentimos sua falta.',
    subheadline: 'Selecionamos algumas peças novas no seu estilo. Frete grátis acima de R$ 500 e devolução em 30 dias.',
    cta: { label: 'Ver coleção atual', href: '/produtos' },
  },
  lost: {
    headline: 'Voltou.',
    subheadline: 'Joalheria contemporânea continua sendo nosso foco. Peças finalizadas à mão no nosso ateliê em São Paulo.',
    cta: { label: 'Reconhecer o ateliê', href: '/sobre' },
  },
  new: {
    headline: 'Sua primeira escolha começa aqui.',
    subheadline: 'Enquanto sua peça é finalizada, descubra outras criações que vão envelhecer junto com você.',
    cta: { label: 'Ver coleção', href: '/produtos' },
  },
  promising: {
    headline: 'Continue construindo seu repertório.',
    subheadline: 'Peças que conversam entre si — argolas com solitários, correntes com pingentes finos.',
    cta: { label: 'Ver coleção', href: '/produtos' },
  },
};

/**
 * PersonalizedHero — server component que detecta segmento RFM do cliente
 * e passa cópia customizada para o HeroExperiment (que ainda respeita
 * variantes A/B configuradas via /experiments admin).
 *
 * Modo degradado: try/catch em cada step → defaults gerais quando DB falha
 * ou cliente é anônimo/sem pedidos.
 */
export async function PersonalizedHero({
  defaultHeadline,
  defaultSubheadline,
  defaultCta,
}: PersonalizedHeroProps) {
  let email: string | undefined;
  try {
    const session = await auth();
    email = session?.user?.email?.toLowerCase();
  } catch {
    // sem session — usa defaults
  }

  if (!email) {
    return (
      <HeroExperiment
        defaultHeadline={defaultHeadline}
        defaultSubheadline={defaultSubheadline}
        defaultCta={defaultCta}
      />
    );
  }

  try {
    const [agg] = await db
      .select({
        orderCount: sql<number>`cast(count(*) as int)`,
        totalCents: sql<number>`cast(sum(${orders.totalCents}) as int)`,
        lastOrderAt: sql<string>`max(${orders.createdAt})`,
        firstOrderAt: sql<string>`min(${orders.createdAt})`,
        userId: orders.userId,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, TENANT_ID),
          eq(orders.customerEmail, email),
          not(eq(orders.status, 'cancelled')),
        )
      )
      .groupBy(orders.userId);

    if (!agg || agg.orderCount === 0) {
      return (
        <HeroExperiment
          defaultHeadline={defaultHeadline}
          defaultSubheadline={defaultSubheadline}
          defaultCta={defaultCta}
        />
      );
    }

    const profiles = scoreCustomers([{
      email,
      userId: agg.userId,
      orderCount: agg.orderCount,
      totalCents: agg.totalCents,
      lastOrderAt: new Date(agg.lastOrderAt),
      firstOrderAt: new Date(agg.firstOrderAt),
    }]);
    const profile = profiles[0];
    const copy = profile ? SEGMENT_COPY[profile.segment] : undefined;

    if (!copy) {
      return (
        <HeroExperiment
          defaultHeadline={defaultHeadline}
          defaultSubheadline={defaultSubheadline}
          defaultCta={defaultCta}
        />
      );
    }

    return (
      <HeroExperiment
        defaultHeadline={copy.headline}
        defaultSubheadline={copy.subheadline}
        defaultCta={copy.cta}
      />
    );
  } catch {
    return (
      <HeroExperiment
        defaultHeadline={defaultHeadline}
        defaultSubheadline={defaultSubheadline}
        defaultCta={defaultCta}
      />
    );
  }
}
