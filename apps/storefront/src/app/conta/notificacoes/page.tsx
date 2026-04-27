import { NotificacoesToggle } from '../../../components/account/notificacoes-toggle';

export const dynamic = 'force-dynamic';

export default function ContaNotificacoesPage() {
  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.5vw, 36px)',
            margin: 0,
            color: 'var(--text-primary)',
            fontWeight: 400,
          }}
        >
          Notificações
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
          Receba avisos no navegador quando seu pedido andar ou produtos da wishlist voltarem.
        </p>
      </header>

      <NotificacoesToggle />

      <p
        style={{
          marginTop: 32,
          fontSize: 12,
          color: 'var(--text-muted)',
          maxWidth: 560,
          lineHeight: 1.5,
        }}
      >
        Você pode revogar a permissão a qualquer momento nas configurações do seu navegador.
        Suas preferências são armazenadas apenas nesta loja e não compartilhadas com terceiros.
      </p>
    </div>
  );
}
