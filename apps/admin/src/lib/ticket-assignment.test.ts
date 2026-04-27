import { describe, expect, it } from 'vitest';
import { pickFirstMatch, pickNextRoundRobin, type AssignableRule } from './ticket-assignment';

const ruleKeywordEntrega: AssignableRule = {
  id: 'r1', ruleType: 'keyword', keyword: 'entrega', targetUserId: 'user-logistica',
  priority: 10, active: true, metadata: {},
};
const ruleKeywordPagamento: AssignableRule = {
  id: 'r2', ruleType: 'keyword', keyword: 'reembolso', targetUserId: 'user-financeiro',
  priority: 20, active: true, metadata: {},
};
const ruleRR: AssignableRule = {
  id: 'r3', ruleType: 'round_robin', keyword: null, targetUserId: null,
  priority: 100, active: true, metadata: { userIds: ['user-a', 'user-b', 'user-c'] },
};

describe('pickFirstMatch (keyword)', () => {
  it('keyword match → retorna regra correta', () => {
    const result = pickFirstMatch([ruleKeywordEntrega, ruleKeywordPagamento, ruleRR], 'Problema com entrega', 'demorou demais');
    expect(result?.id).toBe('r1');
    expect(result?.targetUserId).toBe('user-logistica');
  });

  it('respeita priority — keyword priority 20 antes de round_robin priority 100', () => {
    const result = pickFirstMatch([ruleRR, ruleKeywordPagamento], 'Pedido de reembolso', '');
    expect(result?.id).toBe('r2');
  });

  it('no keyword match e sem round_robin → retorna null', () => {
    const result = pickFirstMatch([ruleKeywordEntrega, ruleKeywordPagamento], 'Dúvida sobre tamanho', 'qual o aro?');
    expect(result).toBeNull();
  });

  it('regra inativa é ignorada', () => {
    const inactive = { ...ruleKeywordEntrega, active: false };
    const result = pickFirstMatch([inactive, ruleRR], 'entrega atrasada', '');
    expect(result?.id).toBe('r3'); // cai pro round_robin
  });
});

describe('pickNextRoundRobin', () => {
  it('primeira chamada (sem último atribuído) → user-a', () => {
    const next = pickNextRoundRobin(ruleRR, null);
    expect(next).toBe('user-a');
  });

  it('próximo após user-a → user-b', () => {
    const next = pickNextRoundRobin(ruleRR, 'user-a');
    expect(next).toBe('user-b');
  });

  it('wrap-around: último era user-c → volta pra user-a', () => {
    const next = pickNextRoundRobin(ruleRR, 'user-c');
    expect(next).toBe('user-a');
  });

  it('user fora da lista → reseta pra primeiro', () => {
    const next = pickNextRoundRobin(ruleRR, 'user-fora-do-grupo');
    expect(next).toBe('user-a');
  });

  it('sem candidatos em metadata → cai pra targetUserId direto', () => {
    const lonely: AssignableRule = { ...ruleRR, metadata: {}, targetUserId: 'fallback-user' };
    const next = pickNextRoundRobin(lonely, 'qualquer-user');
    expect(next).toBe('fallback-user');
  });
});
