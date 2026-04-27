// Best send hour — analisa histórico de open events de email/notificação
// e retorna hora UTC com maior taxa de engajamento.
//
// Helper puro: caller passa array de events (timestamps + opens), retorna
// melhor hora 0-23 com confiança.

export interface OpenEvent {
  /** Timestamp do open event. */
  openedAt: Date;
}

export interface BestSendHourResult {
  /** Hora 0-23 com maior contagem de opens. */
  bestHour: number;
  /** Total de opens no histórico. */
  totalOpens: number;
  /** Distribuição opens por hora. */
  histogram: number[];
  /** Confiança baixa quando totalOpens < threshold. */
  confidence: 'low' | 'medium' | 'high';
}

const MIN_OPENS_MEDIUM = 10;
const MIN_OPENS_HIGH = 50;

export function bestSendHour(events: OpenEvent[]): BestSendHourResult {
  const histogram = new Array<number>(24).fill(0);
  for (const e of events) {
    const h = e.openedAt.getUTCHours();
    histogram[h]!++;
  }
  const totalOpens = events.length;
  let bestHour = 9; // default 9am UTC quando nenhum open
  let bestCount = 0;
  for (let h = 0; h < 24; h++) {
    if (histogram[h]! > bestCount) {
      bestCount = histogram[h]!;
      bestHour = h;
    }
  }
  let confidence: BestSendHourResult['confidence'] = 'low';
  if (totalOpens >= MIN_OPENS_HIGH) confidence = 'high';
  else if (totalOpens >= MIN_OPENS_MEDIUM) confidence = 'medium';

  return { bestHour, totalOpens, histogram, confidence };
}

/**
 * Computa NPS score a partir de respostas individuais.
 * NPS = % Promoters (9-10) - % Detractors (0-6). Range -100 a +100.
 */
export interface NpsResponse {
  score: number; // 0-10
}

export interface NpsResult {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}

export function computeNps(responses: NpsResponse[]): NpsResult {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const r of responses) {
    if (r.score >= 9) promoters++;
    else if (r.score >= 7) passives++;
    else detractors++;
  }
  const total = responses.length;
  if (total === 0) {
    return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
  }
  const promoterPct = (promoters / total) * 100;
  const detractorPct = (detractors / total) * 100;
  const nps = Math.round((promoterPct - detractorPct) * 10) / 10;
  return { nps, promoters, passives, detractors, total };
}
