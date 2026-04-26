// Emails.jsx — 4 transactional email templates (table-based, email-safe)
window.EmailGallery = function EmailGallery() {
  const tabs = [
    { id: "order",   label: "Confirmação de pedido", body: <EmailOrder/> },
    { id: "pix",     label: "Pix gerado",            body: <EmailPix/> },
    { id: "shipped", label: "Pedido enviado",        body: <EmailShipped/> },
    { id: "trade",   label: "Troca aprovada",        body: <EmailTrade/> },
  ];
  const [t, setT] = React.useState(tabs[0].id);
  const cur = tabs.find(x => x.id === t);
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px var(--container-pad) 80px" }}>
      <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>Templates</div>
      <h1 style={{ fontSize: 48, margin: 0 }}>Emails transacionais</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 8, marginBottom: 28 }}>HTML email-safe · table-based · responsive · web-safe fonts com fallback display</p>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--divider)", marginBottom: 36 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={()=>setT(tab.id)} style={{
            background: "none", border: "none", padding: "12px 20px", cursor: "pointer",
            fontSize: 14, color: t === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
            borderBottom: "2px solid " + (t === tab.id ? "var(--text-primary)" : "transparent"),
            marginBottom: -1, fontWeight: t === tab.id ? 500 : 400, fontFamily: "var(--font-body)",
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ background: "#E8E2D6", padding: 40, borderRadius: 8, display: "grid", placeItems: "center" }}>
        {cur.body}
      </div>
    </div>
  );
};

const emailFont = `Georgia, 'Times New Roman', serif`;
const emailBody = `-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`;

function EmailShell({ preview, children }) {
  return (
    <table cellPadding="0" cellSpacing="0" style={{ width: 600, background: "#FAF7F0", fontFamily: emailBody, color: "#1A1612" }}>
      <tbody>
        <tr><td style={{ padding: "32px 40px", borderBottom: "1px solid #E8E2D6" }}>
          <div style={{ fontFamily: emailFont, fontSize: 22, letterSpacing: "0.02em" }}>Casa Solar</div>
        </td></tr>
        {preview && <tr><td style={{ padding: "0 40px", color: "#A89B8C", fontSize: 11, height: 0, opacity: 0 }}>{preview}</td></tr>}
        {children}
        <tr><td style={{ padding: "32px 40px", background: "#F4F1E9", fontSize: 12, color: "#6B6055", lineHeight: 1.6 }}>
          Atendimento: ola@casasolar.com.br · seg–sex 9h–18h<br/>
          Casa Solar Joalheria · CNPJ 00.000.000/0001-00 · São Paulo, SP<br/>
          <a href="#" style={{ color: "#6B6055" }}>Cancelar inscrição</a> · <a href="#" style={{ color: "#6B6055" }}>Política de privacidade</a>
        </td></tr>
      </tbody>
    </table>
  );
}

function EmailOrder() {
  return (
    <EmailShell preview="Recebemos seu pedido PED-184722">
      <tr><td style={{ padding: "40px 40px 24px" }}>
        <div style={{ fontFamily: emailFont, fontSize: 32, lineHeight: 1.2, marginBottom: 12 }}>Recebemos seu pedido.</div>
        <div style={{ fontSize: 14, color: "#6B6055" }}>Maria, obrigada pela compra. Já avisamos a bancada.</div>
      </td></tr>
      <tr><td style={{ padding: "0 40px 24px" }}>
        <table cellPadding="0" cellSpacing="0" style={{ width: "100%", background: "#fff", borderRadius: 4 }}>
          <tbody>
            <tr><td style={{ padding: 20, borderBottom: "1px solid #E8E2D6" }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#A89B8C" }}>Pedido</div>
              <div style={{ fontFamily: "monospace", fontSize: 16, marginTop: 4 }}>PED-184722</div>
            </td></tr>
            <tr><td style={{ padding: 20 }}>
              <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ width: 60, paddingRight: 14 }}>
                      <div style={{ aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 4 }}/>
                    </td>
                    <td>
                      <div style={{ fontFamily: emailFont, fontSize: 16 }}>Aliança Solitário</div>
                      <div style={{ fontSize: 12, color: "#6B6055" }}>ouro 18k · aro 14 · 1×</div>
                    </td>
                    <td style={{ textAlign: "right", fontSize: 14 }}>R$ 2.890,00</td>
                  </tr>
                </tbody>
              </table>
            </td></tr>
            <tr><td style={{ padding: 20, borderTop: "1px solid #E8E2D6", fontSize: 14 }}>
              <Line k="Subtotal" v="R$ 2.890,00"/>
              <Line k="Frete (Sedex)" v="R$ 32,00"/>
              <Line k="Total" v="R$ 2.922,00" bold/>
            </td></tr>
          </tbody>
        </table>
      </td></tr>
      <tr><td style={{ padding: "0 40px 32px" }}>
        <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#A89B8C", marginBottom: 14 }}>Próximos passos</div>
        <Step n="1" t="Pagamento" d="Aguardamos confirmação"/>
        <Step n="2" t="Produção" d="3-5 dias úteis · feita à mão"/>
        <Step n="3" t="Envio" d="Você recebe o rastreio aqui"/>
        <a href="#" style={btnEmail}>Acompanhar pedido</a>
      </td></tr>
    </EmailShell>
  );
}

function EmailPix() {
  return (
    <EmailShell preview="Seu Pix está pronto · expira em 30 min">
      <tr><td style={{ padding: "40px 40px 24px" }}>
        <div style={{ fontFamily: emailFont, fontSize: 32, lineHeight: 1.2, marginBottom: 12 }}>Seu Pix está pronto.</div>
        <div style={{ fontSize: 14, color: "#6B6055" }}>Pague em qualquer banco — confirmação em segundos.</div>
      </td></tr>
      <tr><td style={{ padding: "0 40px 24px" }}>
        <table cellPadding="0" cellSpacing="0" style={{ width: "100%", background: "#fff", borderRadius: 4 }}>
          <tbody>
            <tr><td style={{ padding: 24, textAlign: "center" }}>
              <div style={{ width: 160, height: 160, background: "#fff", margin: "0 auto", display: "grid", placeItems: "center", border: "1px solid #E8E2D6" }}>
                <QRCodeSimple/>
              </div>
              <div style={{ marginTop: 16, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#A89B8C" }}>ou copie a chave</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, padding: 12, background: "#F4F1E9", borderRadius: 4, marginTop: 8, wordBreak: "break-all" }}>00020126580014BR.GOV.BCB.PIX0136abc-def-ghi5204000053039865802BR</div>
            </td></tr>
            <tr><td style={{ padding: 20, borderTop: "1px solid #E8E2D6", fontSize: 14 }}>
              <Line k="Valor" v="R$ 2.776,90"/>
              <Line k="Desconto Pix (5%)" v="– R$ 145,10"/>
              <Line k="Expira em" v="30 minutos" bold/>
            </td></tr>
          </tbody>
        </table>
      </td></tr>
      <tr><td style={{ padding: "0 40px 32px" }}>
        <div style={{ fontSize: 13, color: "#6B6055", lineHeight: 1.6 }}>Após o pagamento, sua peça começa a ser produzida em até 24h. Você recebe atualizações por aqui.</div>
      </td></tr>
    </EmailShell>
  );
}

function EmailShipped() {
  return (
    <EmailShell preview="Sua peça saiu da bancada">
      <tr><td style={{ padding: "40px 40px 24px" }}>
        <div style={{ fontFamily: emailFont, fontSize: 32, lineHeight: 1.2, marginBottom: 12 }}>Sua peça está a caminho.</div>
        <div style={{ fontSize: 14, color: "#6B6055" }}>Embalada com cuidado · previsão de entrega 22 abr.</div>
      </td></tr>
      <tr><td style={{ padding: "0 40px 24px" }}>
        <table cellPadding="0" cellSpacing="0" style={{ width: "100%", background: "#fff", borderRadius: 4 }}>
          <tbody>
            <tr><td style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#A89B8C" }}>Código de rastreio</div>
              <div style={{ fontFamily: "monospace", fontSize: 22, marginTop: 6 }}>BR123456789</div>
              <a href="#" style={{ ...btnEmail, marginTop: 18 }}>Acompanhar entrega</a>
            </td></tr>
            <tr><td style={{ padding: 24, borderTop: "1px solid #E8E2D6" }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#A89B8C", marginBottom: 14 }}>Trajeto</div>
              <ShippedLine status="done"    label="Postado"      date="16 abr · São Paulo"/>
              <ShippedLine status="current" label="Em trânsito"  date="hoje · Rio de Janeiro"/>
              <ShippedLine status="future"  label="Entregue"     date="previsto 22 abr"/>
            </td></tr>
          </tbody>
        </table>
      </td></tr>
    </EmailShell>
  );
}

function EmailTrade() {
  return (
    <EmailShell preview="Sua troca foi aprovada">
      <tr><td style={{ padding: "40px 40px 24px" }}>
        <div style={{ fontFamily: emailFont, fontSize: 32, lineHeight: 1.2, marginBottom: 12 }}>Troca aprovada.</div>
        <div style={{ fontSize: 14, color: "#6B6055" }}>Anexamos a etiqueta reversa. Basta levar a uma agência dos Correios.</div>
      </td></tr>
      <tr><td style={{ padding: "0 40px 24px" }}>
        <table cellPadding="0" cellSpacing="0" style={{ width: "100%", background: "#fff", borderRadius: 4 }}>
          <tbody>
            <tr><td style={{ padding: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#A89B8C", marginBottom: 14 }}>Como devolver</div>
              <Step n="1" t="Imprima a etiqueta" d="Anexamos em PDF neste email"/>
              <Step n="2" t="Embale a peça" d="Use a embalagem original ou caixa similar"/>
              <Step n="3" t="Leve aos Correios" d="Você tem 7 dias para postar"/>
              <a href="#" style={{ ...btnEmail, marginTop: 14 }}>Baixar etiqueta (PDF)</a>
            </td></tr>
            <tr><td style={{ padding: 20, borderTop: "1px solid #E8E2D6", fontSize: 13, color: "#6B6055", lineHeight: 1.7 }}>
              Após o recebimento, processamos a troca em até 3 dias úteis. Em caso de devolução, o reembolso aparece em até 7 dias úteis.
            </td></tr>
          </tbody>
        </table>
      </td></tr>
    </EmailShell>
  );
}

function Line({ k, v, bold }) {
  return (
    <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}><tbody><tr>
      <td style={{ padding: "4px 0", color: bold ? "#1A1612" : "#6B6055", fontSize: bold ? 16 : 14, fontFamily: bold ? emailFont : emailBody }}>{k}</td>
      <td style={{ padding: "4px 0", textAlign: "right", fontSize: bold ? 18 : 14, fontFamily: bold ? emailFont : emailBody }}>{v}</td>
    </tr></tbody></table>
  );
}
function Step({ n, t, d }) {
  return (
    <table cellPadding="0" cellSpacing="0" style={{ width: "100%", marginBottom: 10 }}><tbody><tr>
      <td style={{ width: 28, fontFamily: emailFont, fontSize: 18, color: "#B8956A", verticalAlign: "top" }}>{n}</td>
      <td><div style={{ fontWeight: 500, fontSize: 14 }}>{t}</div><div style={{ fontSize: 12, color: "#6B6055" }}>{d}</div></td>
    </tr></tbody></table>
  );
}
function ShippedLine({ status, label, date }) {
  const c = status === "done" ? "#B8956A" : status === "current" ? "#1A1612" : "#A89B8C";
  return (
    <table cellPadding="0" cellSpacing="0" style={{ width: "100%", marginBottom: 8 }}><tbody><tr>
      <td style={{ width: 16 }}><div style={{ width: 10, height: 10, borderRadius: 999, background: status === "future" ? "transparent" : c, border: "1.5px solid " + c }}/></td>
      <td style={{ fontSize: 14, color: status === "future" ? "#A89B8C" : "#1A1612", fontWeight: status === "current" ? 500 : 400 }}>{label}</td>
      <td style={{ fontSize: 12, color: "#A89B8C", textAlign: "right" }}>{date}</td>
    </tr></tbody></table>
  );
}
const btnEmail = {
  display: "inline-block", padding: "12px 22px", background: "#1A1612", color: "#FAF7F0",
  textDecoration: "none", fontSize: 14, fontFamily: emailBody, borderRadius: 2, marginTop: 18,
};
function QRCodeSimple() {
  return (
    <svg width="140" height="140" viewBox="0 0 21 21">
      {Array.from({length: 21*21}).map((_, i) => {
        const x = i % 21, y = Math.floor(i/21);
        const corner = (x<7&&y<7) || (x>13&&y<7) || (x<7&&y>13);
        const dot = corner ? ((x===0||x===6||y===0||y===6||x===14||x===20||(x>=2&&x<=4&&y>=2&&y<=4)||(x>=16&&x<=18&&y>=2&&y<=4)||(x>=2&&x<=4&&y>=16&&y<=18))) : ((x*7+y*11)%3===0);
        return dot ? <rect key={i} x={x} y={y} width="1" height="1" fill="#1A1612"/> : null;
      })}
    </svg>
  );
}
