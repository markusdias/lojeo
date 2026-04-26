import Link from 'next/link';
import { auth } from '../../../auth';
import { lookupInviteToken } from '../../../lib/invites';
import { AcceptInviteForm } from './AcceptInviteForm';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  operador: 'Operador',
  editor: 'Editor',
  atendimento: 'Atendimento',
  financeiro: 'Financeiro',
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await lookupInviteToken(token);
  const session = await auth();

  if (!lookup.ok) {
    const reasonText: Record<typeof lookup.reason, string> = {
      not_found: 'Este convite não foi encontrado. Confira se o link foi copiado por inteiro.',
      expired: 'Este convite expirou. Peça ao administrador para gerar um novo.',
      already_accepted: 'Este convite já foi aceito anteriormente.',
    };
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">Convite inválido</h1>
          <p className="text-sm text-gray-600">{reasonText[lookup.reason]}</p>
          <Link href="/login" className="inline-block text-sm text-blue-600 hover:underline">Voltar ao login</Link>
        </div>
      </main>
    );
  }

  const invite = lookup.invite;
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const inviteEmail = invite.email.toLowerCase();
  const isLoggedAsCorrectEmail = !!sessionEmail && sessionEmail === inviteEmail;
  const isLoggedAsWrongEmail = !!sessionEmail && sessionEmail !== inviteEmail;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-neutral-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 space-y-5">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">Convite para o admin Lojeo</h1>
          <p className="text-sm text-gray-600 mt-1">
            Você foi convidado(a) com o papel <strong>{ROLE_LABELS[invite.role] ?? invite.role}</strong>.
          </p>
        </header>

        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Email do convite</div>
          <div className="font-mono text-gray-900">{invite.email}</div>
          <div className="text-xs text-gray-500 mt-2">
            Expira em {new Date(invite.expiresAt).toLocaleString('pt-BR')}
          </div>
        </div>

        {isLoggedAsWrongEmail && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
            Você está logado como <strong>{sessionEmail}</strong>, mas este convite é para <strong>{invite.email}</strong>.
            Saia da conta atual e faça login com o email convidado.
            <div className="mt-2">
              <Link href="/api/auth/signout" className="text-amber-900 underline">Sair</Link>
            </div>
          </div>
        )}

        {!sessionEmail && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
            Faça login com o email <strong>{invite.email}</strong> e o convite será aceito automaticamente.
            <div className="mt-2">
              <Link href="/login" className="text-blue-900 underline">Ir para login</Link>
            </div>
          </div>
        )}

        {isLoggedAsCorrectEmail && (
          <AcceptInviteForm token={token} email={invite.email} />
        )}
      </div>
    </main>
  );
}
