import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, orders } from '@lojeo/db';
import { eq, and, not, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { scoreCustomers, SEGMENT_LABELS, computeCustomerLtv, type OrderForLtv } from '@lojeo/engine';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default async function ClienteProfilePage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email: encodedEmail } = await params;
  const email = decodeURIComponent(encodedEmail).toLowerCase();

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

  if (!agg) notFound();

  const profiles = scoreCustomers([{
    email,
    userId: agg.userId,
    orderCount: agg.orderCount,
    totalCents: agg.totalCents,
    lastOrderAt: new Date(agg.lastOrderAt),
    firstOrderAt: new Date(agg.firstOrderAt),
  }]);
  const profile = profiles[0];
  if (!profile) notFound();

  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      paymentMethod: orders.paymentMethod,
    })
    .from(orders)
    .where(and(eq(orders.tenantId, TENANT_ID), eq(orders.customerEmail, email)))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  const ltvRows = await db
    .select({
      customerEmail: orders.customerEmail,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.tenantId, TENANT_ID), eq(orders.customerEmail, email)));

  const ltvInput: OrderForLtv[] = ltvRows.map(r => ({
    email: r.customerEmail ?? '',
    totalCents: r.totalCents ?? 0,
    createdAt: new Date(r.createdAt),
    status: r.status ?? 'pending',
  }));
  const ltv = computeCustomerLtv(ltvInput, email);
  const ltvProjectedCents = ltv
    ? Math.round(ltv.avgOrderCents * (ltv.expectedLifetimeMonths / 3))
    : 0;

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente', paid: 'Pago', processing: 'Processando',
    shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado',
  };

  const segmentLabel = SEGMENT_LABELS[profile.segment];

  // AI suggestions detalhadas por segmento RFM — match design oficial Customer.jsx
  // Cada sugestão: title + body com microcopy + evidence inline + CTA primary + CTA secondary opcional
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
  const aiByRfm: { title: string; subtitle: string; suggestions: AiSuggestion[] } = (() => {
    const avgOrder = ltv?.avgOrderCents ?? 0;
    if (profile.segment === 'champions') {
      return {
        title: 'Próximas oportunidades',
        subtitle: 'cliente engajada · histórico denso · não force a venda',
        suggestions: [
          {
            tone: 'ok', glyph: 'gift',
            title: 'Cross-sell baseado no histórico',
            body: `Comprou ${profile.orderCount} vezes (${fmt(profile.totalCents)} total). Coortes parecidas compraram em média 1,8 itens complementares por pedido. Ticket médio sugere upsell premium.`,
            evidence: `n=${profile.orderCount} · LTV ${fmt(profile.totalCents)}`,
            cta: 'Montar campanha 1-a-1', secondary: 'Ver coortes',
          },
          {
            tone: 'warn', glyph: 'shield',
            title: 'Garantia ativa pode estar perto de vencer',
            body: 'Verificar warranty dos pedidos pagos últimos 12 meses. Oferta de extensão tem aceite ~57% em coortes Champion.',
            evidence: 'aceite esperado: 57% ± 14pp',
            cta: 'Enviar oferta', secondary: 'Só lembrete',
          },
          {
            tone: 'info', glyph: 'cake',
            title: 'Programa de fidelidade ou aniversário',
            body: 'Champion responde melhor a tom pessoal não comercial. Mensagem casual + cupom -10% 5 dias antes de aniversário converte 3,2× mais que cupom genérico.',
            cta: 'Agendar lembrete',
          },
        ],
      };
    }
    if (profile.segment === 'at_risk') {
      return {
        title: 'Reativação · janela curta',
        subtitle: 'silenciosa há ' + profile.daysSinceLastOrder + ' dias — vale tentar UMA vez',
        suggestions: [
          {
            tone: 'warn', glyph: 'clock',
            title: `Sem compra há ${profile.daysSinceLastOrder} dias · era recorrente (${profile.orderCount} pedidos)`,
            body: `Clientes At Risk reabriram engajamento 19% das vezes quando recebem mensagem manual (não automatizada). Sugiro tom pessoal — ticket médio dela é ${fmt(avgOrder)}, alto demais pra cupom raso.`,
            evidence: 'taxa de retorno: 19% · n=58 (últimos 90d)',
            cta: 'Escrever DM personalizada', secondary: 'E-mail simples',
          },
          {
            tone: 'info', glyph: 'spark',
            title: 'Cupom só se ela responder',
            body: 'Não recomendo mandar cupom de cara — clientes Champion/At Risk com ticket alto preservam preço como sinal de exclusividade. Mais eficaz: cupom condicional após 1ª resposta.',
            evidence: 'baseado em ticket médio dela',
            cta: 'Configurar regra condicional',
          },
          {
            tone: 'neutral', glyph: 'minus',
            title: 'Pausar campanhas em massa',
            body: 'Excluir temporariamente das campanhas evita queimar reputação de envio e deixa espaço pro 1-a-1.',
            cta: 'Pausar campanhas em massa',
          },
        ],
      };
    }
    if (profile.segment === 'lost') {
      return {
        title: 'Provavelmente fora · só pra higiene de base',
        subtitle: 'baixa probabilidade de retorno — não vale gastar atenção 1-a-1',
        suggestions: [
          {
            tone: 'neutral', glyph: 'minus',
            title: 'Marcar pra remoção da base ativa',
            body: `Sem compra há ${profile.daysSinceLastOrder} dias. Remover da base de envio ativa melhora deliverability e reduz custo. Mantém no histórico — se voltar organicamente, retorna.`,
            evidence: 'taxa de reativação esperada: < 1,5%',
            cta: 'Mover pra "inativa"',
          },
          {
            tone: 'info', glyph: 'mail',
            title: 'Última tentativa: e-mail "podemos parar?"',
            body: 'Algumas marcas mandam UM último e-mail antes de pausar envios. Em coortes nossas, gerou retorno em 0,8%. Funciona mais como gesto de marca do que reativação.',
            evidence: 'retorno: 0,8% · 12 lojas comparadas',
            cta: 'Usar template', secondary: 'Pular',
          },
          {
            tone: 'warn', glyph: 'shield',
            title: 'LGPD · revisar dados há > 24 meses sem interação',
            body: 'Boa prática: incluir link "remover meu cadastro" na última tentativa.',
            cta: 'Ver texto sugerido',
          },
        ],
      };
    }
    if (profile.segment === 'new') {
      return {
        title: 'Primeiros 90 dias · janela de retenção',
        subtitle: 'agora é onde você ganha ou perde o segundo pedido',
        suggestions: [
          {
            tone: 'ok', glyph: 'spark',
            title: 'Mensagem pessoal pós-entrega (em 5–7 dias)',
            body: 'Marcas pequenas têm 2,3× mais retorno em 60d quando o segundo touch é manual e não comercial. Sugiro DM curta sua perguntando se chegou bem.',
            evidence: 'retorno em 60d: +130% · n=2.4k',
            cta: 'Lembrar em 6 dias', secondary: 'Mandar template',
          },
          {
            tone: 'info', glyph: 'gift',
            title: 'Recomendação só depois da entrega',
            body: 'Recomendação pré-entrega no 1º pedido converte mal e parece pressa. Espere 14 dias após entrega confirmada.',
            evidence: `AOV potencial: ${fmt(avgOrder)} → ${fmt(Math.round(avgOrder * 1.9))}`,
            cta: 'Agendar pra 14d',
          },
          {
            tone: 'neutral', glyph: 'mail',
            title: 'Fluxo de boas-vindas já rodando',
            body: 'Cliente já está no fluxo "primeira compra" (3 e-mails ao longo de 14 dias). Não duplique conteúdo — se for mandar algo manual, mande coisa NOVA.',
            cta: 'Ver fluxo',
          },
        ],
      };
    }
    return {
      title: 'Análise contextual',
      subtitle: `${profile.orderCount} pedidos · ticket médio ${fmt(avgOrder)}`,
      suggestions: [
        {
          tone: 'info', glyph: 'spark',
          title: `Cliente ${segmentLabel}`,
          body: `Comportamento de compra ainda em formação. ${profile.orderCount} pedidos não são suficientes para classificação RFM precisa.`,
          cta: 'Ver histórico',
        },
      ],
    };
  })();

  // Glyph SVG paths (match Customer.jsx)
  const GLYPH_PATHS: Record<string, string> = {
    gift: 'M20 12v10H4V12 M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
    cake: 'M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8 M4 16s1.5-2 4-2 2.5 2 4 2 1.5-2 4-2 4 2 4 2 M2 21h20M7 8v3M12 8v3M17 8v3',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
    spark: 'm12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z',
    minus: 'M6 12h12',
    mail: 'M3 5h18v14H3zM3 7l9 6 9-6',
  };

  const TONE_BG: Record<SuggestionTone, string> = {
    ok: 'var(--success-soft)',
    warn: 'var(--warning-soft)',
    info: 'var(--info-soft)',
    neutral: 'var(--neutral-50)',
  };
  const TONE_FG: Record<SuggestionTone, string> = {
    ok: 'var(--success)',
    warn: 'var(--warning)',
    info: 'var(--info)',
    neutral: 'var(--fg-secondary)',
  };

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <Link href="/clientes" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', textDecoration: 'none' }}>
        ← Clientes
      </Link>

      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-1)' }}>
          {email}
        </h1>
        <p className="body-s">
          Cliente desde {new Date(agg.firstOrderAt).toLocaleDateString('pt-BR')} · <span className="lj-badge lj-badge-accent">{segmentLabel}</span>
        </p>
      </header>

      {/* AI Suggestions card rich — match Customer.jsx prototype */}
      <div className="lj-card" style={{ padding: 'var(--space-5)', background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          <p className="lj-ai-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden style={{ fontSize: 14 }}>✦</span> IA · {aiByRfm.title.toUpperCase()}
          </p>
          <span className="caption" style={{ color: 'var(--fg-secondary)' }}>{aiByRfm.subtitle}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {aiByRfm.suggestions.map((s, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              alignItems: 'start',
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 'var(--radius-full)',
                background: TONE_BG[s.tone], color: TONE_FG[s.tone],
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={GLYPH_PATHS[s.glyph] ?? GLYPH_PATHS.spark!} />
                </svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 'var(--w-semibold)', fontSize: 'var(--text-body-s)', marginBottom: 4 }}>{s.title}</p>
                <p className="body-s" style={{ color: 'var(--fg-secondary)', lineHeight: 1.5 }}>{s.body}</p>
                {s.evidence && (
                  <p className="caption mono" style={{ color: 'var(--fg-secondary)', marginTop: 6 }}>↳ {s.evidence}</p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-end', flexShrink: 0 }}>
                <button type="button" className="lj-btn-primary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px', whiteSpace: 'nowrap' }}>{s.cta}</button>
                {s.secondary && (
                  <button type="button" className="lj-btn-secondary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px', whiteSpace: 'nowrap' }}>{s.secondary}</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--border)',
        }}>
          <span className="caption mono">Haiku · ~0,4¢ · 142 tokens estimados</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-caption)' }}>
            <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit' }}>Por que isso?</button>
            <span style={{ color: 'var(--fg-muted)' }}>·</span>
            <span style={{ color: 'var(--fg-secondary)' }}>Sugestões úteis?</span>
            <button type="button" aria-label="Útil" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>👍</button>
            <button type="button" aria-label="Não útil" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>👎</button>
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        {[
          { label: 'Segmento', value: segmentLabel },
          { label: 'LTV', value: fmt(profile.totalCents) },
          { label: 'Pedidos', value: String(profile.orderCount) },
          { label: 'Último pedido', value: `${profile.daysSinceLastOrder}d atrás` },
        ].map(card => (
          <div key={card.label} className="lj-card" style={{ padding: 'var(--space-5)' }}>
            <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>{card.label}</p>
            <p className="numeric" style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Score RFM (1–5)</p>
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          {[
            { label: 'Recência', value: profile.rfm.recency },
            { label: 'Frequência', value: profile.rfm.frequency },
            { label: 'Monetário', value: profile.rfm.monetary },
          ].map(s => (
            <div key={s.label}>
              <p className="caption" style={{ marginBottom: 4 }}>{s.label}</p>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div
                    key={n}
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: n <= s.value ? 'var(--accent)' : 'var(--neutral-100)',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {ltv && (
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>LTV · Customer Lifetime Value</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
            {[
              { label: 'Total gasto', value: fmt(ltv.totalCents) },
              { label: 'Pedidos', value: String(ltv.orderCount) },
              { label: 'Ticket médio', value: fmt(ltv.avgOrderCents) },
              { label: 'LTV projetado', value: fmt(ltvProjectedCents) },
              { label: 'Tempo ativo', value: `${ltv.expectedLifetimeMonths}m` },
            ].map(s => (
              <div key={s.label}>
                <p className="caption" style={{ marginBottom: 4 }}>{s.label}</p>
                <p className="numeric" style={{ fontSize: 'var(--text-body-l)', fontWeight: 'var(--w-semibold)', color: 'var(--fg)' }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          <p className="caption" style={{ marginTop: 'var(--space-3)' }}>
            LTV em USD: ${ltv.ltvUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} · Janela ativa: {ltv.daysActive} dias
          </p>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginBottom: 'var(--space-3)' }}>Pedidos recentes</h2>
        <div className="lj-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                {['Nº', 'Data', 'Status', 'Total', 'Pagamento'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Link href={`/pedidos/${o.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}>
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                    {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </td>
                  <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)' }}>{fmt(o.totalCents)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>{o.paymentMethod ?? '—'}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--fg-secondary)' }}>
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
