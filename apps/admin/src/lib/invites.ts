import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, userInviteTokens, userRoles } from '@lojeo/db';

export type InviteLookupResult =
  | { ok: true; invite: typeof userInviteTokens.$inferSelect }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_accepted' };

/**
 * Lookup invite token + validate not expired and not yet accepted.
 */
export async function lookupInviteToken(token: string): Promise<InviteLookupResult> {
  const [row] = await db
    .select()
    .from(userInviteTokens)
    .where(eq(userInviteTokens.token, token))
    .limit(1);

  if (!row) return { ok: false, reason: 'not_found' };
  if (row.acceptedAt) return { ok: false, reason: 'already_accepted' };
  if (row.expiresAt.getTime() <= Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, invite: row };
}

/**
 * Aceita convite — atualiza userRoles (vincula userId real, marca acceptedAt)
 * e marca o invite como aceito. Idempotente: se já aceito, no-op.
 *
 * O caller deve garantir que `email === invite.email`.
 */
export async function acceptInvite(params: {
  inviteId: string;
  userId: string;
  email: string;
}): Promise<{ accepted: boolean }> {
  const { inviteId, userId, email } = params;
  const now = new Date();

  // Re-check still pending under lock-free pattern (optimistic)
  const [invite] = await db
    .select()
    .from(userInviteTokens)
    .where(and(
      eq(userInviteTokens.id, inviteId),
      isNull(userInviteTokens.acceptedAt),
      gt(userInviteTokens.expiresAt, now),
    ))
    .limit(1);
  if (!invite) return { accepted: false };

  // Atualiza user_roles: vincula userId real ao convite (placeholder anterior = zero uuid)
  // Estratégia: tenta UPDATE em entry com email + tenant + placeholder userId.
  // Se não houver, cria uma nova com role correto.
  const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000000';
  const [existingPlaceholder] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(
      eq(userRoles.tenantId, invite.tenantId),
      eq(userRoles.email, email),
      eq(userRoles.userId, PLACEHOLDER_USER_ID),
    ))
    .limit(1);

  if (existingPlaceholder) {
    await db
      .update(userRoles)
      .set({ userId, acceptedAt: now, updatedAt: now })
      .where(eq(userRoles.id, existingPlaceholder.id));
  } else {
    // Pode acontecer se userRoles foi removido depois do convite —
    // recria a entry com o role do invite para honrar o convite.
    const [existingByUser] = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(and(
        eq(userRoles.tenantId, invite.tenantId),
        eq(userRoles.userId, userId),
      ))
      .limit(1);

    if (!existingByUser) {
      await db.insert(userRoles).values({
        tenantId: invite.tenantId,
        userId,
        email,
        role: invite.role,
        invitedByUserId: invite.invitedByUserId,
        acceptedAt: now,
      }).onConflictDoNothing();
    } else {
      // Já existe role para esse user — apenas atualiza role para o do convite + acceptedAt
      await db
        .update(userRoles)
        .set({ role: invite.role, acceptedAt: now, updatedAt: now })
        .where(eq(userRoles.id, existingByUser.id));
    }
  }

  await db
    .update(userInviteTokens)
    .set({ acceptedAt: now, acceptedByUserId: userId })
    .where(eq(userInviteTokens.id, inviteId));

  return { accepted: true };
}

/**
 * Auto-aceite no signIn: aceita TODOS convites pendentes para o email do user.
 * Chamado pelo callback signIn do NextAuth.
 */
export async function autoAcceptInvitesForUser(params: {
  userId: string;
  email: string;
}): Promise<{ acceptedCount: number }> {
  const { userId, email } = params;
  const now = new Date();

  const pending = await db
    .select()
    .from(userInviteTokens)
    .where(and(
      eq(userInviteTokens.email, email.toLowerCase()),
      isNull(userInviteTokens.acceptedAt),
      gt(userInviteTokens.expiresAt, now),
    ));

  let acceptedCount = 0;
  for (const inv of pending) {
    const r = await acceptInvite({ inviteId: inv.id, userId, email: email.toLowerCase() });
    if (r.accepted) acceptedCount++;
  }
  // Defesa adicional: se há userRoles em estado placeholder para esse email mesmo sem invite válido
  // (ex.: invites expirados), faz vínculo igualmente para não deixar role órfão.
  if (acceptedCount === 0) {
    const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000000';
    await db
      .update(userRoles)
      .set({ userId, acceptedAt: now, updatedAt: now })
      .where(and(
        eq(userRoles.email, email.toLowerCase()),
        eq(userRoles.userId, PLACEHOLDER_USER_ID),
      ));
  }
  return { acceptedCount };
}

// Compute absolute invite URL given an admin origin.
export function buildInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/invite/${token}`;
}
