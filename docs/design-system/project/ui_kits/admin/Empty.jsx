// Empty.jsx — Empty states for first-run lojas
// Single Lucide-style line icon + microcopy + CTA verde.
// Tone: warm, contextual, "é normal nas primeiras semanas".

const EmptyShell = ({ title, sub, icon, headline, body, primary, secondary }) => (
  <main className="main">
    <div className="page-header"><div><h1>{title}</h1><p className="sub">{sub}</p></div></div>
    <div className="empty-state empty-state--lucide">
      <div className="empty-icon">{icon}</div>
      <h2>{headline}</h2>
      <p>{body}</p>
      <div className="actions">
        {primary && <button className="btn primary">{primary}</button>}
        {secondary && <button className="btn secondary">{secondary}</button>}
      </div>
    </div>
  </main>
);

// Lucide-style line icons — stroke 1.5, currentColor, 56×56
const IconShoppingBag = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
    <path d="M3 6h18"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const IconUsers = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconStar = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const IconPackage = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15"/>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="M3.3 7 12 12l8.7-5"/>
    <path d="M12 22V12"/>
  </svg>
);

function EmptyOrders() {
  return (
    <EmptyShell
      title="Pedidos"
      sub="Aguardando primeira venda"
      icon={<IconShoppingBag/>}
      headline="Nenhum pedido ainda"
      body="É normal nas primeiras semanas. Quer divulgar sua loja?"
      primary="Compartilhar link"
      secondary="Ver dicas de tráfego"
    />
  );
}

function EmptyProducts() {
  return (
    <EmptyShell
      title="Produtos"
      sub="Vamos cadastrar o primeiro"
      icon={<IconPackage/>}
      headline="Sem produtos ainda"
      body="Comece cadastrando seu primeiro produto — leva 2 minutinhos. Ou suba uma planilha CSV se já tiver catálogo."
      primary="+ Novo produto"
      secondary="Importar CSV"
    />
  );
}

function EmptyCustomers() {
  return (
    <EmptyShell
      title="Clientes"
      sub="Sua base de relacionamento"
      icon={<IconUsers/>}
      headline="Nenhum cliente ainda"
      body="Vão chegar com os primeiros pedidos — com histórico, segmentação RFM e tags prontas pra campanhas."
      primary="+ Cadastro manual"
      secondary="Importar de planilha"
    />
  );
}

function EmptyReviews() {
  return (
    <EmptyShell
      title="Avaliações"
      sub="Provas sociais que vendem por você"
      icon={<IconStar/>}
      headline="Nenhuma avaliação ainda"
      body="Convide quem comprou nos últimos 7 dias — costuma render 3× mais resposta que pedidos automáticos pós-30 dias."
      primary="Enviar convite"
      secondary="Configurar automação"
    />
  );
}

window.EmptyOrders = EmptyOrders;
window.EmptyProducts = EmptyProducts;
window.EmptyCustomers = EmptyCustomers;
window.EmptyReviews = EmptyReviews;
