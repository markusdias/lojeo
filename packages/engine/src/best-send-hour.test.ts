import { describe, it, expect } from 'vitest';
import { bestSendHour, computeNps } from './best-send-hour';

describe('bestSendHour', () => {
  it('vazio retorna default 9 + confidence low', () => {
    const r = bestSendHour([]);
    expect(r.bestHour).toBe(9);
    expect(r.totalOpens).toBe(0);
    expect(r.confidence).toBe('low');
  });

  it('detecta hora com mais opens', () => {
    const events = [
      { openedAt: new Date('2026-04-27T14:30:00Z') },
      { openedAt: new Date('2026-04-26T14:15:00Z') },
      { openedAt: new Date('2026-04-25T14:00:00Z') },
      { openedAt: new Date('2026-04-24T09:00:00Z') },
    ];
    const r = bestSendHour(events);
    expect(r.bestHour).toBe(14);
    expect(r.totalOpens).toBe(4);
    expect(r.histogram[14]).toBe(3);
    expect(r.histogram[9]).toBe(1);
  });

  it('confidence medium quando >= 10', () => {
    const events = Array.from({ length: 12 }, () => ({
      openedAt: new Date('2026-04-27T18:00:00Z'),
    }));
    const r = bestSendHour(events);
    expect(r.confidence).toBe('medium');
  });

  it('confidence high quando >= 50', () => {
    const events = Array.from({ length: 60 }, () => ({
      openedAt: new Date('2026-04-27T18:00:00Z'),
    }));
    const r = bestSendHour(events);
    expect(r.confidence).toBe('high');
  });

  it('histogram 24 buckets', () => {
    const r = bestSendHour([{ openedAt: new Date('2026-04-27T03:30:00Z') }]);
    expect(r.histogram).toHaveLength(24);
    expect(r.histogram[3]).toBe(1);
  });
});

describe('computeNps', () => {
  it('vazio retorna 0', () => {
    expect(computeNps([])).toEqual({ nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 });
  });

  it('100% promoters → NPS 100', () => {
    const r = computeNps([{ score: 10 }, { score: 9 }]);
    expect(r.promoters).toBe(2);
    expect(r.detractors).toBe(0);
    expect(r.nps).toBe(100);
  });

  it('100% detractors → NPS -100', () => {
    const r = computeNps([{ score: 0 }, { score: 5 }, { score: 6 }]);
    expect(r.detractors).toBe(3);
    expect(r.nps).toBe(-100);
  });

  it('50% promoters + 50% detractors → NPS 0', () => {
    const r = computeNps([{ score: 9 }, { score: 9 }, { score: 0 }, { score: 6 }]);
    expect(r.nps).toBe(0);
  });

  it('passives não contribuem (score 7-8)', () => {
    const r = computeNps([{ score: 7 }, { score: 8 }, { score: 9 }]);
    expect(r.promoters).toBe(1);
    expect(r.passives).toBe(2);
    expect(r.detractors).toBe(0);
    // 33.3% promoters - 0% detractors = 33.3 (rounded 33.3)
    expect(r.nps).toBeCloseTo(33.3, 1);
  });

  it('range -100 a +100', () => {
    const allPromoters = computeNps(Array.from({ length: 10 }, () => ({ score: 10 })));
    const allDetractors = computeNps(Array.from({ length: 10 }, () => ({ score: 0 })));
    expect(allPromoters.nps).toBe(100);
    expect(allDetractors.nps).toBe(-100);
  });
});
