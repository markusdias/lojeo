import { redirect } from 'next/navigation';

export default function NotificacoesPreferenciasRedirect() {
  redirect('/settings#notificacoes');
}
