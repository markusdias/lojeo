import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { acceptInvite, lookupInviteToken } from '../../../../../lib/invites';
import { recordAuditLog } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

// POST /api/users/invites/accept  body: { token: string }
//
// Cenários:
//  - Não logado: 401 com { needsLogin: true, email } — UI orienta a fazer login com o email convidado.
//  - Logado mas email não confere: 400 { error: 'wrong_email', expectedEmail }.
//  - Logado e email confere: aceita e retorna { ok: true, redirect: '/settings/users?accepted=1' }.
//  - Token inválido / expirado / já aceito: 400 com reason específico.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: 'token_required' }, { status: 400 });
  }

  const lookup = await lookupInviteToken(token);
  if (!lookup.ok) {
    return NextResponse.json({ error: 'invite_invalid', reason: lookup.reason }, { status: 400 });
  }
  const invite = lookup.invite;

  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const sessionUserId = session?.user?.id ?? null;

  if (!sessionEmail || !sessionUserId) {
    return NextResponse.json({
      error: 'needs_login',
      message: `Faça login com o email ${invite.email} para aceitar o convite. O aceite ocorre automaticamente após o login.`,
      email: invite.email,
    }, { status: 401 });
  }

  if (sessionEmail !== invite.email.toLowerCase()) {
    return NextResponse.json({
      error: 'wrong_email',
      message: `Este convite é para ${invite.email}. Você está logado como ${sessionEmail}.`,
      expectedEmail: invite.email,
    }, { status: 400 });
  }

  const r = await acceptInvite({
    inviteId: invite.id,
    userId: sessionUserId,
    email: sessionEmail,
  });

  if (!r.accepted) {
    // Race: outro fluxo aceitou antes — tratar como sucesso idempotente.
    return NextResponse.json({ ok: true, alreadyAccepted: true, redirect: '/settings/users?accepted=1' });
  }

  await recordAuditLog({
    session,
    action: 'role.invite_accept',
    entityType: 'user_invite_token',
    entityId: invite.id,
    after: { email: invite.email, role: invite.role, acceptedByUserId: sessionUserId },
  });

  return NextResponse.json({ ok: true, redirect: '/settings/users?accepted=1' });
}
