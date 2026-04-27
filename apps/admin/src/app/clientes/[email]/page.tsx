import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, orders, orderItems, productVariants, products, supportTickets } from '@lojeo/db';
import { eq, and, not, desc, inArray, sql } from 'drizzle-orm';
import { scoreCustomers, SEGMENT_LABELS, computeCustomerLtv, computeWarrantyBatch, type OrderForLtv } from '@lojeo/engine';
import { CustomerTabs, type OrderRow, type WarrantyRow, type TicketRow } from './customer-tabs';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s@.]+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

// Formata "beatriz.lima" / "carolina_p" / "ju-tavares" -> "Beatriz Lima"
function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  return parts
    .map(s => (s[0]?.toUpperCase() ?? '') + s.slice(1).toLowerCase())
    .join(' ') || email;
}

// Pitch contextual por segmento RFM — combina dados reais do profile.
function pitchFor(
  segment: string,
  daysSinceLastOrder: number,
  orderCount: number,
): string {
  switch (segment) {
    case 'champions':
      return `Compra recorrente · histórico denso (${orderCount} pedidos) · cliente engajada que responde melhor a tom pessoal.`;
    case 'loyal':
      return `Cliente fiel · ${orderCount} pedidos no histórico · vale cuidar do relacionamento sem forçar venda.`;
    case 'at_risk':
      return `Era cliente recorrente · não compra há ${daysSinceLastOrder} dias · vale tentar reativação 1-a-1, sem cupom raso.`;
    case 'lost':
      return `Sumiu há ${daysSinceLastOrder} dias · baixa probabilidade de retorno · trate como higiene de base.`;
    case 'new':
      return `Primeira compra recente · janela crítica de retenção · o segundo pedido se ganha agora.`;
    case 'promising':
      return `Padrão promissor · ${orderCount} pedidos com recência boa · vale acompanhar de perto.`;
    default:
      return `${orderCount} pedidos no histórico · sem padrão RFM forte ainda.`;
  }
}

// Tag "prefere {categoria}" — placeholder até virmos do schema (custom fields).
function preferenceTag(segment: string): string | null {
  if (segment === 'champions' || segment === 'loyal') return 'prefere brincos';
  if (segment === 'new') return 'comprou brinco';
  if (segment === 'at_risk') return 'comprou pulseiras';
  return null;
}

const SEGMENT_COLOR: Record<string, string> = {
  champions: 'linear-gradient(135deg, #00553D, #34C796)',
  loyal: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
  at_risk: 'linear-gradient(135deg, #B45309, #F59E0B)',
  lost: 'linear-gradient(135deg, #6B7280, #9CA3AF)',
  new: 'linear-gradient(135deg, #6D28D9, #A855F7)',
  promising: 'linear-gradient(135deg, #0E7490, #06B6D4)',
  other: 'linear-gradient(135deg, #475569, #94A3B8)',
};

export default async function ClienteProfilePage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email: encodedEmail } = await params;
  const email = decodeURIComponent(encodedEmail).toLowerCase();

  // Busca TODOS customers do tenant (não só este) pra ter distribuição válida pros quintis RFM.
  // scoreCustomers com 1 input retorna fallback (3/3/3) — sem distribuição não dá pra ranquear.
  const allCustomers = await db
    .select({
      email: orders.customerEmail,
      userId: orders.userId,
      orderCount: sql<number>`cast(count(*) as int)`,
      totalCents: sql<number>`cast(sum(${orders.totalCents}) as int)`,
      lastOrderAt: sql<string>`max(${orders.createdAt})`,
      firstOrderAt: sql<string>`min(${orders.createdAt})`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, TENANT_ID),
        not(eq(orders.status, 'cancelled')),
      )
    )
    .groupBy(orders.customerEmail, orders.userId);

  const agg = allCustomers.find(c => c.email === email);
  if (!agg) notFound();

  const inputs = allCustomers
    .filter(c => c.email)
    .map(c => ({
      email: c.email as string,
      userId: c.userId,
      orderCount: c.orderCount,
      totalCents: c.totalCents,
      lastOrderAt: new Date(c.lastOrderAt),
      firstOrderAt: new Date(c.firstOrderAt),
    }));

  const profiles = scoreCustomers(inputs);
  const profile = profiles.find(p => p.email === email);
  if (!profile) notFound();

  const segmentLabel = SEGMENT_LABELS[profile.segment];
  const segmentGradient = SEGMENT_COLOR[profile.segment] ?? SEGMENT_COLOR.other;

  // Pedidos pra tabela + warranty source
  const customerOrdersFull = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      paymentMethod: orders.paymentMethod,
      shippedAt: orders.shippedAt,
      deliveredAt: orders.deliveredAt,
      shippingAddress: orders.shippingAddress,
    })
    .from(orders)
    .where(and(eq(orders.tenantId, TENANT_ID), eq(orders.customerEmail, email)))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const orderRows: OrderRow[] = customerOrdersFull.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status ?? 'pending',
    totalCents: o.totalCents ?? 0,
    createdAt: (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as string)).toISOString(),
    paymentMethod: o.paymentMethod ?? null,
  }));

  // Endereço/telefone do último pedido com address
  const lastWithAddress = customerOrdersFull.find(o => o.shippingAddress);
  const addr = (lastWithAddress?.shippingAddress as Record<string, string> | null) ?? null;

  // LTV
  const ltvInput: OrderForLtv[] = customerOrdersFull.map(r => ({
    email,
    totalCents: r.totalCents ?? 0,
    createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string),
    status: r.status ?? 'pending',
  }));
  const ltv = computeCustomerLtv(ltvInput, email);

  // Warranties
  const customerOrderIdMap = new Map(customerOrdersFull.map(o => [o.id, o]));
  const warrantyItems = customerOrdersFull.length > 0 ? await db
    .select({
      orderId: orderItems.orderId,
      orderItemId: orderItems.id,
      productId: productVariants.productId,
      productName: orderItems.productName,
      warrantyMonths: products.warrantyMonths,
    })
    .from(orderItems)
    .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .leftJoin(products, eq(productVariants.productId, products.id))
    .where(inArray(orderItems.orderId, customerOrdersFull.map(o => o.id))) : [];

  const warranties = computeWarrantyBatch(warrantyItems.map(w => {
    const o = customerOrderIdMap.get(w.orderId);
    const startsAtRaw = o?.deliveredAt ?? o?.shippedAt ?? o?.createdAt ?? new Date();
    return {
      orderId: w.orderId,
      orderItemId: w.orderItemId,
      productId: w.productId ?? null,
      productName: w.productName,
      warrantyMonths: w.warrantyMonths,
      startsAt: typeof startsAtRaw === 'string' ? new Date(startsAtRaw) : startsAtRaw,
    };
  })).filter(w => w.status !== 'none');

  // Lookup orderNumber + warrantyMonths source pra match texto da ref Customer.jsx
  const warrantyMonthsByItem = new Map(warrantyItems.map(w => [w.orderItemId, w.warrantyMonths ?? null]));
  const warrantyRows: WarrantyRow[] = warranties.map(w => {
    const order = customerOrderIdMap.get(w.orderId);
    return {
      orderItemId: w.orderItemId,
      productName: w.productName,
      startsAt: w.startsAt.toISOString(),
      expiresAt: w.expiresAt?.toISOString() ?? null,
      daysRemaining: w.daysRemaining,
      status: w.status,
      orderNumber: order?.orderNumber ?? null,
      warrantyMonths: warrantyMonthsByItem.get(w.orderItemId) ?? null,
    };
  });

  // Tickets
  const ticketRowsRaw = await db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      status: supportTickets.status,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .where(and(eq(supportTickets.tenantId, TENANT_ID), eq(supportTickets.customerEmail, email)))
    .orderBy(desc(supportTickets.createdAt))
    .limit(20);
  const ticketRows: TicketRow[] = ticketRowsRaw.map(t => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    createdAt: (t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt as string)).toISOString(),
  }));

  // AI suggestions detalhadas por segmento RFM
  type SuggestionTone = 'ok' | 'warn' | 'info' | 'neutral';
  interface AiSuggestion {
    tone: SuggestionTone;
    glyph: string;
    title: string;
    body: string;
    evidence?: string;
    cta: string;
    secondary?: string;
  }
  // AI suggestions: copy match Customer.jsx (4 personas RFM) — texto curado pelo design oficial.
  const aiByRfm: { title: string; subtitle: string; suggestions: AiSuggestion[] } = (() => {
    const avgOrder = ltv?.avgOrderCents ?? 0;
    if (profile.segment === 'champions') {
      return {
        title: 'Próximas oportunidades',
        subtitle: 'cliente engajada · histórico denso · não force a venda',
        suggestions: [
          { tone: 'ok', glyph: 'gift', title: 'Cross-sell: brincos pra fechar o conjunto do anel', body: 'Comprou o anel solitário em jan. Tem 4 pares de brinco do mesmo estilo curador no estoque, 2 com folga. Clientes parecidas (12) compraram em média 1,8 brinco por anel. Ela já tem a tag "prefere brincos".', evidence: 'similaridade: 0,82 · n=12', cta: 'Montar campanha 1-a-1' },
          { tone: 'warn', glyph: 'shield', title: 'Garantia do anel expira em 18 dias', body: 'Oferecer extensão de 12 meses por R$ 89. Em coortes parecidas, 4 de 7 aceitaram. Margem 71%. Se preferir, mande só o lembrete (sem oferta paga).', evidence: 'aceite esperado: 57% ± 14pp', cta: 'Enviar oferta', secondary: 'Só lembrete' },
          { tone: 'info', glyph: 'cake', title: 'Aniversário em 14 jul (12 semanas)', body: 'Agendar lembrete pra mandar cupom -10% 5 dias antes. Mensagem usa o tom "casual caloroso" definido na Aparência.', cta: 'Agendar' },
        ],
      };
    }
    if (profile.segment === 'at_risk') {
      return {
        title: 'Reativação · janela curta',
        subtitle: 'silenciosa há 4 meses, mas ainda abre e-mails — vale tentar UMA vez',
        suggestions: [
          { tone: 'warn', glyph: 'clock', title: 'Carrinho abandonado há 23 dias · pulseira de R$ 920', body: 'Item ainda no estoque. Clientes em "At Risk" reabriram o carrinho 19% das vezes quando recebem mensagem manual (não automatizada). Sugiro tom pessoal, sem cupom — só lembrete da peça e oferta de tirar dúvida.', evidence: 'taxa de retorno: 19% · n=58 (últimos 90d)', cta: 'Escrever DM personalizada', secondary: 'Mandar e-mail simples' },
          { tone: 'info', glyph: 'spark', title: 'Cupom só se ela responder', body: 'Não recomendo mandar cupom de cara — Carolina nunca usou cupom de desconto, e o ticket dela é alto. Mais eficaz: oferecer cupom SE ela responder a primeira mensagem. Aumenta conversão sem queimar margem.', evidence: 'baseado em comportamento histórico dela', cta: 'Configurar regra condicional' },
          { tone: 'neutral', glyph: 'minus', title: 'Não enviar para a campanha de massa', body: 'Carolina recebeu 3 e-mails de campanha sem abrir os 2 últimos. Excluí-la temporariamente das campanhas em massa evita queimar reputação de envio e deixa espaço pro 1-a-1.', cta: 'Pausar campanhas em massa' },
        ],
      };
    }
    if (profile.segment === 'lost') {
      return {
        title: 'Provavelmente fora · só pra higiene de base',
        subtitle: 'baixa probabilidade de retorno — não vale gastar atenção 1-a-1',
        suggestions: [
          { tone: 'neutral', glyph: 'minus', title: 'Marcar pra remoção da base ativa', body: 'Sem abertura há 8 meses · sem clique há 11. Remover da base de envio ativa melhora deliverability e reduz custo. Mantemos ela no histórico — se voltar ao site organicamente, retorna pra base automaticamente.', evidence: 'taxa de reativação esperada: < 1,5%', cta: 'Mover pra "inativa"' },
          { tone: 'info', glyph: 'mail', title: 'Última tentativa: e-mail "podemos parar?" (opcional)', body: 'Algumas marcas mandam UM último e-mail estilo "queremos te ouvir antes de parar de mandar nossas novidades". Em coortes nossas, gerou retorno em 0,8%. Funciona mais como gesto de marca do que como reativação real.', evidence: 'retorno: 0,8% · 12 lojas comparadas', cta: 'Usar template', secondary: 'Pular' },
          { tone: 'warn', glyph: 'shield', title: 'LGPD · revisar dados há > 24 meses sem interação', body: 'Por boa prática (não obrigação), reveja se ela ainda quer estar na sua base. O texto da última tentativa pode incluir o link de "remover meu cadastro" pra tornar isso explícito.', cta: 'Ver texto sugerido' },
        ],
      };
    }
    if (profile.segment === 'new') {
      return {
        title: 'Primeiros 90 dias · janela de retenção',
        subtitle: 'agora é onde você ganha ou perde o segundo pedido',
        suggestions: [
          { tone: 'ok', glyph: 'spark', title: 'Mensagem pessoal pós-entrega (em 5–7 dias)', body: 'Pacote chega quinta. Sugiro DM curta de você — não automatizada — perguntando se chegou bem. Marcas pequenas têm 2,3× mais retorno em 60d quando o segundo touch é manual e não comercial.', evidence: 'retorno em 60d: +130% · n=2.4k', cta: 'Lembrar em 6 dias', secondary: 'Mandar template' },
          { tone: 'info', glyph: 'gift', title: 'Recomendação de produto · só depois da entrega', body: 'Com base no brinco que ela comprou, 3 anéis fariam combinação. Mas não recomendo mandar antes da entrega — recomendação pré-entrega no primeiro pedido converte mal e parece pressa. Espere 14 dias.', evidence: 'AOV em 90d: R$ 380 → R$ 720 (potencial)', cta: 'Agendar pra 9 mai' },
          { tone: 'neutral', glyph: 'mail', title: 'Fluxo de boas-vindas já rodando', body: 'Ela está no fluxo "primeira compra" (3 e-mails ao longo de 14 dias). 1º já foi (NF-e + agradecimento). Não duplique conteúdo — se for mandar algo manual, mande coisa NOVA.', evidence: '1/3 enviado · próximo: 30 abr', cta: 'Ver fluxo' },
        ],
      };
    }
    return {
      title: 'Análise contextual',
      subtitle: `${profile.orderCount} pedidos · ticket médio ${fmt(avgOrder)}`,
      suggestions: [
        { tone: 'info', glyph: 'spark', title: `Cliente ${segmentLabel}`, body: `${profile.orderCount} pedidos não são suficientes para classificação RFM precisa.`, cta: 'Ver histórico' },
      ],
    };
  })();

  const GLYPH_PATHS: Record<string, string> = {
    gift: 'M20 12v10H4V12 M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
    cake: 'M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8 M4 16s1.5-2 4-2 2.5 2 4 2 1.5-2 4-2 4 2 4 2 M2 21h20M7 8v3M12 8v3M17 8v3',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
    spark: 'm12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z',
    minus: 'M6 12h12',
    mail: 'M3 5h18v14H3zM3 7l9 6 9-6',
  };
  const TONE_BG: Record<SuggestionTone, string> = { ok: 'var(--success-soft)', warn: 'var(--warning-soft)', info: 'var(--info-soft)', neutral: 'var(--neutral-50)' };
  const TONE_FG: Record<SuggestionTone, string> = { ok: 'var(--success)', warn: 'var(--warning)', info: 'var(--info)', neutral: 'var(--fg-secondary)' };

  // Tags do cliente — match Customer.jsx (4 personas) + segment fallback
  const preference = preferenceTag(profile.segment);
  const cityTag = addr?.city ? (addr?.state ? `${addr.city}` : addr.city) : null;
  type TagTone = 'accent' | 'neutral' | 'info' | 'warning' | 'error';
  const tagItems: { label: string; tone: TagTone }[] = [
    profile.segment === 'champions' ? { label: 'VIP', tone: 'accent' as const } : null,
    profile.segment === 'at_risk' ? { label: 'em risco', tone: 'warning' as const } : null,
    profile.segment === 'lost' ? { label: 'perdida', tone: 'error' as const } : null,
    profile.segment === 'new' ? { label: 'nova', tone: 'info' as const } : null,
    preference ? { label: preference, tone: 'neutral' as const } : null,
    cityTag ? { label: cityTag, tone: 'neutral' as const } : null,
    // Tag estática Champion match Customer.jsx
    profile.segment === 'champions' ? { label: 'aniversário 14 jul', tone: 'info' as const } : null,
    profile.segment === 'at_risk' ? { label: 'aberta last newsletter', tone: 'neutral' as const } : null,
    profile.segment === 'new' ? { label: 'veio do Instagram', tone: 'neutral' as const } : null,
  ].filter((x): x is { label: string; tone: TagTone } => Boolean(x));

  const customerName = displayNameFromEmail(email);
  const customerPitch = pitchFor(profile.segment, profile.daysSinceLastOrder, profile.orderCount);

  // DEMO RFM segment switcher — link rápido entre 4 personas seed (Champion/AtRisk/Lost/New)
  const DEMO_PERSONAS: Array<{ email: string; label: string; rfm: string; segment: string }> = [
    { email: 'beatriz.lima@email.com', label: 'Champion', rfm: '5/5/4', segment: 'champions' },
    { email: 'carolina.p@email.com', label: 'At Risk', rfm: '2/4/4', segment: 'at_risk' },
    { email: 'di.vilela@email.com', label: 'Lost', rfm: '1/2/2', segment: 'lost' },
    { email: 'ju.tavares@email.com', label: 'New', rfm: '5/1/3', segment: 'new' },
  ];

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      {/* Breadcrumb-like eyebrow: "Clientes /" linkado pro index */}
      <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
        <Link href="/clientes" style={{ color: 'inherit', textDecoration: 'none' }}>Clientes</Link>
        <span style={{ margin: '0 6px', color: 'var(--fg-muted)' }}>/</span>
        <span style={{ color: 'var(--fg-secondary)' }}>{customerName}</span>
      </p>

      {/* DEMO RFM segment switcher — match Images #15/21/22/23 (pill chips topo) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        background: 'var(--bg-subtle)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-5)',
        flexWrap: 'wrap',
      }}>
        <span className="caption mono" style={{ color: 'var(--fg-muted)', letterSpacing: 'var(--track-wide)', textTransform: 'uppercase' }}>
          RFM Segment · Demo
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {DEMO_PERSONAS.map(p => {
            const isActive = p.email === email;
            return (
              <Link
                key={p.email}
                href={`/clientes/${encodeURIComponent(p.email)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  background: isActive ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  color: isActive ? 'var(--accent)' : 'var(--fg-secondary)',
                  fontSize: 'var(--text-caption)',
                  fontWeight: isActive ? 'var(--w-semibold)' : 'var(--w-medium)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.label}
                <span className="mono" style={{ color: 'var(--fg-muted)' }}>{p.rfm}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page header com nome + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-1)' }}>
            {customerName}
          </h1>
          <p className="body-s">
            Cliente desde {new Date(agg.firstOrderAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · {profile.orderCount} {profile.orderCount === 1 ? 'pedido' : 'pedidos'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" className="lj-btn-secondary">Nova mensagem</button>
          <button type="button" className="lj-btn-primary">+ Pedido manual</button>
        </div>
      </div>

      {/* Layout 2 colunas: aside profile + main */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* ASIDE — Profile card */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="lj-card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: segmentGradient,
              color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 'var(--w-semibold)',
              margin: '0 auto var(--space-3)',
            }}>
              {initials(email)}
            </div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', marginBottom: 4 }}>
              {customerName}
            </h2>
            <p className="body-s" style={{ color: 'var(--fg-secondary)', marginBottom: 'var(--space-3)' }}>{email}</p>
            <span className="lj-badge lj-badge-accent" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              ♦ {segmentLabel} · RFM {profile.rfm.recency}/{profile.rfm.frequency}/{profile.rfm.monetary}
            </span>
            <p className="body-s" style={{ color: 'var(--fg-secondary)', marginTop: 'var(--space-3)', lineHeight: 1.5 }}>
              {customerPitch}
            </p>
            {/* Stats grid 2x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
              <div>
                <p className="numeric" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>{fmt(profile.totalCents)}</p>
                <p className="caption">LTV</p>
              </div>
              <div>
                <p className="numeric" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>{profile.orderCount}</p>
                <p className="caption">Pedidos</p>
              </div>
              <div>
                <p className="numeric" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>{fmt(ltv?.avgOrderCents ?? 0)}</p>
                <p className="caption">Ticket médio</p>
              </div>
              <div>
                <p className="numeric" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>{profile.daysSinceLastOrder}d</p>
                <p className="caption">Recência</p>
              </div>
            </div>
          </div>

          {/* CONTATO */}
          {(addr?.phone || addr?.street) && (
            <div>
              <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Contato</p>
              <div className="body-s" style={{ lineHeight: 1.7, color: 'var(--fg-secondary)' }}>
                {addr.phone && <p className="numeric" style={{ color: 'var(--fg)' }}>{addr.phone}</p>}
                {addr.street && <p>{addr.street}{addr.number ? `, ${addr.number}` : ''}</p>}
                {addr.complement && <p>{addr.complement}</p>}
                {addr.neighborhood && <p>{addr.neighborhood}{addr.city ? ` · ${addr.city}` : ''}{addr.state ? ` · ${addr.state}` : ''}</p>}
                {addr.postalCode && <p className="mono">CEP {addr.postalCode}</p>}
              </div>
            </div>
          )}

          {/* TAGS */}
          {tagItems.length > 0 && (
            <div>
              <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tagItems.map(t => (
                  <span key={t.label} className={`lj-badge lj-badge-${t.tone}`}>{t.label}</span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* AI Suggestions card rich */}
          <div className="lj-card" style={{ padding: 'var(--space-5)', background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              <p className="lj-ai-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden style={{ fontSize: 14 }}>✦</span> IA · {aiByRfm.title}
              </p>
              <span className="caption" style={{ color: 'var(--fg-secondary)' }}>{aiByRfm.subtitle}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {aiByRfm.suggestions.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', alignItems: 'start' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', background: TONE_BG[s.tone], color: TONE_FG[s.tone], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={GLYPH_PATHS[s.glyph] ?? GLYPH_PATHS.spark!} />
                    </svg>
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 'var(--w-semibold)', fontSize: 'var(--text-body-s)', marginBottom: 4 }}>{s.title}</p>
                    <p className="body-s" style={{ color: 'var(--fg-secondary)', lineHeight: 1.5 }}>{s.body}</p>
                    {s.evidence && <p className="caption mono" style={{ color: 'var(--fg-secondary)', marginTop: 6 }}>↳ {s.evidence}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-end', flexShrink: 0 }}>
                    <button type="button" className="lj-btn-primary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px', whiteSpace: 'nowrap' }}>{s.cta}</button>
                    {s.secondary && <button type="button" className="lj-btn-secondary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px', whiteSpace: 'nowrap' }}>{s.secondary}</button>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
              <span className="caption mono">Haiku · ~0,4¢ · 142 tokens</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-caption)' }}>
                <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>Por que isso?</button>
                <span style={{ color: 'var(--fg-muted)' }}>·</span>
                <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>Sugestões úteis?</button>
                <span style={{ display: 'inline-flex', gap: 4, marginLeft: 2 }}>
                  <button type="button" aria-label="Útil" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>👍</button>
                  <button type="button" aria-label="Não útil" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>👎</button>
                </span>
              </span>
            </div>
          </div>

          {/* Tabs (client component) */}
          <CustomerTabs orders={orderRows} warranties={warrantyRows} tickets={ticketRows} />
        </div>
      </div>
    </div>
  );
}
