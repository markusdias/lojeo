export interface ChurnInput {
  email: string;
  userId?: string | null;
  orderCount: number;
  lastOrderAt: Date | null;
  orderDates?: Date[];
}

export interface ChurnProfile extends ChurnInput {
  daysSinceLastOrder: number;
  avgOrderCycleDays: number;
  churnScore: number; // 0–100 (higher = more at risk)
  churnRisk: 'critical' | 'high' | 'medium' | 'low' | 'active';
  suggestedAction: string;
}

const RISK_LABELS = {
  critical: 'Inativo há muito tempo',
  high: 'Alto risco de churn',
  medium: 'Risco moderado',
  low: 'Engajado',
  active: 'Cliente ativo recente',
} as const;

const SUGGESTED_ACTIONS = {
  critical: 'Campanha de reativação win-back com oferta especial',
  high: 'Email personalizado com produto da wishlist ou recomendação',
  medium: 'Newsletter de novidades + lembrete da última coleção visitada',
  low: 'Fidelização: programa de pontos ou preview exclusivo',
  active: 'Manter fluxo padrão de comunicação',
} as const;

function avgCycle(dates: Date[]): number {
  if (dates.length < 2) return 0;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += (sorted[i]!.getTime() - sorted[i - 1]!.getTime()) / (1000 * 60 * 60 * 24);
  }
  return total / (sorted.length - 1);
}

export function churnScore(input: ChurnInput, now = new Date()): ChurnProfile {
  const daysSinceLastOrder = input.lastOrderAt
    ? Math.floor((now.getTime() - input.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
    : 9999;

  const avgOrderCycleDays = input.orderDates && input.orderDates.length >= 2
    ? avgCycle(input.orderDates)
    : 0;

  const effectiveCycle = Math.max(avgOrderCycleDays, 30);

  // recency ratio: how many "cycles" since last order
  const recencyRatio = daysSinceLastOrder / effectiveCycle;

  // frequency penalty: one-time buyers have higher base risk
  const frequencyPenalty = 1 / Math.max(input.orderCount, 1);

  const rawScore = Math.min(100, Math.round(recencyRatio * 60 + frequencyPenalty * 40));
  const churnScore = Math.max(0, rawScore);

  // Absolute cutoff: >180 days = always critical
  let risk: ChurnProfile['churnRisk'];
  if (daysSinceLastOrder > 180 || churnScore >= 90) {
    risk = 'critical';
  } else if (churnScore >= 70) {
    risk = 'high';
  } else if (churnScore >= 40) {
    risk = 'medium';
  } else if (churnScore >= 15) {
    risk = 'low';
  } else {
    risk = 'active';
  }

  return {
    ...input,
    daysSinceLastOrder,
    avgOrderCycleDays: Math.round(avgOrderCycleDays),
    churnScore,
    churnRisk: risk,
    suggestedAction: SUGGESTED_ACTIONS[risk],
  };
}

export function scoreChurnBatch(inputs: ChurnInput[], now = new Date()): ChurnProfile[] {
  return inputs
    .map(i => churnScore(i, now))
    .sort((a, b) => b.churnScore - a.churnScore);
}

export { RISK_LABELS };
