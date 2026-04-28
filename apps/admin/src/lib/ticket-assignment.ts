import { and, asc, desc, eq } from 'drizzle-orm';
import {
  db,
  ticketAssignmentRules,
  supportTickets,
  userRoles,
  type TicketAssignmentRule,
} from '@lojeo/db';
import { emitMultichannelNotification } from '@lojeo/notifications';
import { TENANT_ID } from './roles';

/**
 * Sprint 9 — Atribuição automática de tickets.
 *
 * Itera regras ativas em ordem crescente de `priority`.
 * - 'keyword'     → se `keyword` (case-insensitive) aparece em subject/body, retorna targetUserId.
 * - 'round_robin' → distribui ciclicamente entre users em metadata.userIds[]
 *                   (fallback: targetUserId direto). Próximo da fila = next após o último atribuído.
 *
 * Retorna null quando nenhuma regra casa.
 *
 * Helper interno `pickFirstMatch` é puro/exportado para testes; resolução de
 * round_robin contra DB pega o último ticket atribuído entre os candidatos.
 */

export type AssignableRule = Pick<
  TicketAssignmentRule,
  'id' | 'ruleType' | 'keyword' | 'targetUserId' | 'priority' | 'active' | 'metadata'
>;

interface RoundRobinMeta {
  userIds?: string[];
}

/**
 * Decide qual regra "casa" para o conteúdo dado. Pura — não acessa DB.
 * Retorna a primeira regra com keyword presente, ou a primeira round_robin
 * encontrada (a resolução de qual user vem do DB acontece fora).
 */
export function pickFirstMatch(
  rules: AssignableRule[],
  subject: string,
  body: string,
): AssignableRule | null {
  const haystack = `${subject} ${body}`.toLowerCase();
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (!rule.active) continue;
    if (rule.ruleType === 'keyword') {
      const kw = (rule.keyword ?? '').trim().toLowerCase();
      if (kw && haystack.includes(kw)) return rule;
    } else if (rule.ruleType === 'round_robin') {
      return rule; // primeira round_robin pega — keyword tem prioridade só via `priority` numérico
    }
  }
  return null;
}

/**
 * Resolve user para round_robin: pega array de candidatos da metadata
 * (ou cai pra targetUserId), busca o último ticket que foi atribuído entre eles
 * e devolve o próximo na fila circular. Sem candidatos → null.
 *
 * Exposto pra testes — recebe `lastAssignedUserId` injetável.
 */
export function pickNextRoundRobin(
  rule: AssignableRule,
  lastAssignedUserId: string | null,
): string | null {
  const meta = (rule.metadata ?? {}) as RoundRobinMeta;
  const candidates = (meta.userIds ?? []).filter((u) => typeof u === 'string' && u.length > 0);

  if (candidates.length === 0) {
    return rule.targetUserId ?? null;
  }
  if (!lastAssignedUserId) {
    return candidates[0] ?? null;
  }
  const idx = candidates.indexOf(lastAssignedUserId);
  if (idx === -1) return candidates[0] ?? null;
  return candidates[(idx + 1) % candidates.length] ?? null;
}

/**
 * Aplica auto-assignment para um ticket recém-criado.
 * Retorna o userId que foi atribuído, ou null se nenhuma regra casou.
 *
 * Falha aqui NUNCA derruba a criação do ticket — caller deve lidar com null.
 */
export async function applyAutoAssignment(
  ticketId: string,
  subject: string,
  body: string,
): Promise<string | null> {
  try {
    const rules = await db
      .select()
      .from(ticketAssignmentRules)
      .where(and(
        eq(ticketAssignmentRules.tenantId, TENANT_ID),
        eq(ticketAssignmentRules.active, true),
      ))
      .orderBy(asc(ticketAssignmentRules.priority));

    const matched = pickFirstMatch(rules, subject, body);
    if (!matched) return null;

    let userId: string | null = null;
    if (matched.ruleType === 'keyword') {
      userId = matched.targetUserId ?? null;
    } else if (matched.ruleType === 'round_robin') {
      const meta = (matched.metadata ?? {}) as RoundRobinMeta;
      const candidates = (meta.userIds ?? []).filter((u) => typeof u === 'string' && u.length > 0);

      // Busca último ticket atribuído entre os candidatos (ou qualquer user
      // assignable se candidates vazio — fallback "all assignable users").
      let lastAssignedUserId: string | null = null;
      if (candidates.length > 0) {
        const [lastTicket] = await db.select({ assignedToUserId: supportTickets.assignedToUserId })
          .from(supportTickets)
          .where(eq(supportTickets.tenantId, TENANT_ID))
          .orderBy(desc(supportTickets.createdAt))
          .limit(50);
        lastAssignedUserId = lastTicket?.assignedToUserId ?? null;
        if (lastAssignedUserId && !candidates.includes(lastAssignedUserId)) {
          lastAssignedUserId = null;
        }
        userId = pickNextRoundRobin(matched, lastAssignedUserId);
      } else {
        // Fallback v1: pega primeiro user com role assignable (admin/operador/atendimento)
        const assignables = await db.select({ userId: userRoles.userId })
          .from(userRoles)
          .where(eq(userRoles.tenantId, TENANT_ID))
          .limit(20);
        const candidateIds = assignables.map((a) => a.userId);
        if (candidateIds.length === 0) return null;
        const [lastTicket] = await db.select({ assignedToUserId: supportTickets.assignedToUserId })
          .from(supportTickets)
          .where(eq(supportTickets.tenantId, TENANT_ID))
          .orderBy(desc(supportTickets.createdAt))
          .limit(1);
        const last = lastTicket?.assignedToUserId ?? null;
        const idx = last ? candidateIds.indexOf(last) : -1;
        userId = idx === -1 ? candidateIds[0] ?? null : candidateIds[(idx + 1) % candidateIds.length] ?? null;
      }
    }

    if (!userId) return null;

    await db.update(supportTickets)
      .set({ assignedToUserId: userId, updatedAt: new Date() })
      .where(and(
        eq(supportTickets.tenantId, TENANT_ID),
        eq(supportTickets.id, ticketId),
      ));

    void emitMultichannelNotification({
      tenantId: TENANT_ID,
      userId,
      type: 'ticket.assigned',
      severity: 'info',
      title: `Ticket atribuído a você`,
      body: subject ? subject.slice(0, 180) : 'Novo ticket aguardando resposta.',
      link: `/tickets/${ticketId}`,
      entityType: 'ticket',
      entityId: ticketId,
      metadata: { ruleType: matched.ruleType },
    });

    return userId;
  } catch (err) {
    // Modo degradado — atribuição automática nunca derruba criação de ticket.
    console.warn('[ticket-assignment] auto-assign failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
