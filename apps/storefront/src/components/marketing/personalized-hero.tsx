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
 *
 * Headline pode conter `{firstName}` — substituído pelo primeiro nome do
 * cliente logado quando disponível, ou removido (com pontuação ajustada)
 * em caso contrário.
 */
const SEGMENT_COPY: Record<string, SegmentCopy> = {
  champions: {
    headline: 'De volta ao ateliê{firstNameComma}.',
    subheadline: 'Suas peças mais recentes inspiraram novas criações. Veja primeiro o que ainda nem entrou na coleção pública.',
    cta: { label: 'Ver novidades exclusivas', href: '/produtos?ordenar=novidades' },
  },
  loyal: {
    headline: 'Bem-vinda de volta{firstNameComma}.',
    subheadline: 'Continue a coleção com peças que combinam com o que você já tem. Ouro 18k e prata 925, finalizadas à mão.',
    cta: { label: 'Ver para você', href: '#para-voce' },
  },
  at_risk: {
    headline: 'Sentimos sua falta{firstNameComma}.',
    subheadline: 'Selecionamos algumas peças novas no seu estilo. Frete grátis acima de R$ 500 e devolução em 30 dias.',
    cta: { label: 'Ver coleção atual', href: '/produtos' },
  },
  lost: {
    headline: 'Voltou{firstNameComma}.',
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
/**
 * Aplica firstName na headline templated. Quando `firstName` existe,
 * substitui `{firstNameComma}` por `, {firstName}`. Quando ausente,
 * remove o placeholder mantendo pontuação coerente.
 */
function interpolateName(headline: string, firstName?: string): string {
  if (firstName && firstName.trim().length > 0) {
    return headline.replace('{firstNameComma}', `, ${firstName.trim()}`);
  }
  return headline.replace('{firstNameComma}', '');
}

export async function PersonalizedHero({
  defaultHeadline,
  defaultSubheadline,
  defaultCta,
}: PersonalizedHeroProps) {
  let email: string | undefined;
  let firstName: string | undefined;
  try {
    const session = await auth();
    email = session?.user?.email?.toLowerCase();
    const fullName = session?.user?.name?.trim();
    if (fullName) firstName = fullName.split(/\s+/)[0];
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
        defaultHeadline={interpolateName(copy.headline, firstName)}
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
