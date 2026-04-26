// Static.jsx — about, returns, privacy, terms + 404/500 + email templates
window.PageAbout = function PageAbout({ go }) {
  return (
    <article>
      <div style={{ aspectRatio: "21/8", background: "linear-gradient(135deg, #E8DDC9, #D4C5A8)", display: "grid", placeItems: "center", color: "var(--text-primary)" }}>
        <div style={{ textAlign: "center", maxWidth: 700, padding: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 16 }}>Nossa história</div>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", margin: 0, lineHeight: 1.05 }}>Joias feitas à mão, para durar uma vida.</h1>
        </div>
      </div>
      <Container>
        <Long>
          <p>Começamos em 2014, em uma pequena bancada no centro de São Paulo. Hoje, três joalheiras trabalham com a gente — e cada peça ainda é finalizada à mão.</p>
        </Long>
        <ContentSection title="Materiais" body="Trabalhamos exclusivamente com ouro 18k, ouro branco e prata 925 certificada. Nada de banhos. Nada de aço. Apenas metais nobres que envelhecem bonito."/>
        <ContentSection title="Processo" body="Cada peça é desenhada, fundida, polida e aferida manualmente. Levamos de 3 a 5 dias úteis para finalizar — sob medida, até 21 dias."/>
        <ContentSection title="Garantia" body="Toda peça tem 1 ano de cobertura contra defeitos de fabricação. Polimento e ajustes leves são vitalícios."/>
        <Gallery/>
        <CTA go={go}/>
      </Container>
    </article>
  );
};

function Long({ children }) { return <div style={{ maxWidth: 720, fontSize: 18, lineHeight: 1.7, color: "var(--text-secondary)", padding: "60px 0 30px" }}>{children}</div>; }
function ContentSection({ title, body }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 60, padding: "32px 0", borderTop: "1px solid var(--divider)" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: 0 }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 16, lineHeight: 1.7, maxWidth: 580 }}>{body}</p>
    </div>
  );
}
function Gallery() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, padding: "60px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ aspectRatio: i === 1 ? "3/4" : "4/5", background: "#F4F1E9", borderRadius: 4, overflow: "hidden" }}>
          <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        </div>
      ))}
    </div>
  );
}
function CTA({ go }) {
  return (
    <div style={{ background: "var(--surface)", padding: 48, borderRadius: 8, textAlign: "center", margin: "20px 0 80px" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, margin: "0 0 14px" }}>Conheça as peças</h3>
      <Button onClick={()=>go({ name:"plp", category: null })}>Ver coleção</Button>
    </div>
  );
}

window.PageReturns = function PageReturns() {
  return (
    <Container>
      <PageHeader k="Política" t="Trocas e devoluções"/>
      <Long>
        <p>Você tem 7 dias corridos a partir do recebimento para solicitar troca ou devolução. A peça deve estar com etiqueta, embalagem original e sem sinais de uso.</p>
        <p>Para iniciar, acesse <em>Conta &rsaquo; Pedidos &rsaquo; Abrir troca</em>. Enviamos uma etiqueta reversa por email. O reembolso é processado em até 7 dias úteis após o recebimento.</p>
      </Long>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, marginTop: 40 }}>Prazos por situação</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 14 }}>
        <thead><tr style={{ borderBottom: "1px solid var(--divider)" }}>
          <th style={th}>Situação</th><th style={th}>Prazo</th><th style={th}>Custo</th>
        </tr></thead>
        <tbody>
          <Tr s="Troca por outro tamanho" p="até 7 dias" c="frete por nossa conta"/>
          <Tr s="Defeito de fabricação" p="até 1 ano" c="cobertura total"/>
          <Tr s="Arrependimento" p="até 7 dias" c="frete por nossa conta"/>
          <Tr s="Sob medida" p="apenas defeito" c="—"/>
        </tbody>
      </table>
      <div style={{ height: 80 }}/>
    </Container>
  );
};

const th = { textAlign: "left", padding: "12px 16px", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 500 };
const td = { padding: "14px 16px", borderBottom: "1px solid var(--divider)" };
function Tr({ s, p, c }) { return <tr><td style={td}>{s}</td><td style={td}>{p}</td><td style={{...td, color: "var(--text-secondary)"}}>{c}</td></tr>; }

window.PagePrivacy = function PagePrivacy() {
  return (
    <Container>
      <PageHeader k="Política" t="Privacidade · LGPD"/>
      <Long>
        <p>Esta política descreve como coletamos, usamos e protegemos seus dados, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
        <h3>Dados que coletamos</h3>
        <p>Nome, CPF, endereço, email e telefone — exclusivamente para processar pedidos, emitir nota fiscal e prestar atendimento. Dados de pagamento são processados por gateway certificado e não ficam armazenados em nossos sistemas.</p>
        <h3>Seus direitos</h3>
        <p>Você pode solicitar acesso, correção, anonimização ou exclusão dos seus dados a qualquer momento, escrevendo para <em>privacidade@joalheria.com.br</em>.</p>
      </Long>
      <div style={{ height: 80 }}/>
    </Container>
  );
};

window.PageTerms = function PageTerms() {
  return (
    <Container>
      <PageHeader k="Termos" t="Termos de uso"/>
      <Long>
        <p>Bem-vinda à nossa loja. Ao usar este site, você concorda com os termos abaixo.</p>
        <h3>Uso do site</h3><p>Este site destina-se à venda de joias finas. É proibido revender peças sem autorização escrita.</p>
        <h3>Pagamento</h3><p>Aceitamos Pix, cartão de crédito (até 6× sem juros) e boleto. O pedido é confirmado após a aprovação do pagamento.</p>
        <h3>Entrega</h3><p>Prazos variam por região e modalidade. Sob medida: até 21 dias úteis.</p>
        <h3>Foro</h3><p>Fica eleito o foro da comarca de São Paulo / SP.</p>
      </Long>
      <div style={{ height: 80 }}/>
    </Container>
  );
};

function Container({ children }) { return <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 var(--container-pad)" }}>{children}</div>; }
function PageHeader({ k, t }) {
  return (
    <div style={{ padding: "60px 0 30px" }}>
      <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>{k}</div>
      <h1 style={{ fontSize: 56, margin: 0 }}>{t}</h1>
    </div>
  );
}

window.NotFound = function NotFound({ code, go }) {
  const is500 = code === 500;
  return (
    <div style={{ minHeight: "calc(100vh - 80px)", display: "grid", placeItems: "center", padding: 40 }}>
      <div style={{ textAlign: "center", maxWidth: 540 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 140, lineHeight: 1, color: "var(--accent)", letterSpacing: "-0.04em" }}>{is500 ? "500" : "404"}</div>
        <h1 style={{ fontSize: 36, margin: "12px 0 14px" }}>{is500 ? "Algo se desencaixou aqui." : "Esta peça não foi encontrada."}</h1>
        <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {is500 ? "Estamos arrumando. Tente novamente em alguns minutos — ou volte para a coleção." : "Talvez tenha sido vendida, ou você tenha digitado errado. Que tal voltar para a coleção?"}
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 10, justifyContent: "center" }}>
          <Button onClick={()=>go({ name:"plp", category: null })}>Voltar para coleção</Button>
          <Button variant="ghost" onClick={()=>go({ name:"home" })}>Início</Button>
        </div>
      </div>
    </div>
  );
};
