// Checkout.jsx — multi-step checkout with sticky summary
const { useState: _useStateChk } = React;

window.Checkout = function Checkout({ items, go }) {
  const [step, setStep] = _useStateChk(1);
  const [data, setData] = _useStateChk({
    email: "", cep: "", street: "", number: "", complement: "", city: "", uf: "",
    shipping: null, payment: "pix", parcelas: 1, cardNum: "", cardName: "", cardExp: "", cardCvv: "",
  });
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const subtotal = items.reduce((s, it) => s + (CATALOG.find(x=>x.id===it.id)?.price || 0) * it.qty, 0);
  const shippingCost = data.shipping?.cost ?? 0;
  const pixDiscount  = data.payment === "pix" ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + shippingCost - pixDiscount;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px var(--container-pad) 0" }}>
      <Stepper step={step}/>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 56, alignItems: "start", marginTop: 48 }}>
        <div>
          {step === 1 && <StepContact data={data} set={set} onNext={()=>setStep(2)}/>}
          {step === 2 && <StepShipping data={data} set={set} onBack={()=>setStep(1)} onNext={()=>setStep(3)}/>}
          {step === 3 && <StepPayment data={data} set={set} onBack={()=>setStep(2)} onNext={()=>setStep(4)} total={total}/>}
          {step === 4 && <StepConfirm go={go}/>}
        </div>
        {step !== 4 && <CheckoutSummary items={items} subtotal={subtotal} shipping={data.shipping} pixDiscount={pixDiscount} total={total} step={step}/>}
      </div>
    </div>
  );
};

function Stepper({ step }) {
  const labels = ["Contato", "Frete", "Pagamento", "Confirmação"];
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 12 }}>
      {labels.map((l, i) => {
        const n = i + 1, active = n === step, done = n < step;
        return (
          <React.Fragment key={l}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center",
                fontSize: 12, fontWeight: 600,
                background: active ? "var(--text-primary)" : done ? "var(--accent)" : "var(--surface)",
                color: active || done ? "#fff" : "var(--text-muted)",
                border: "1px solid " + (active ? "var(--text-primary)" : done ? "var(--accent)" : "var(--divider)"),
              }}>{done ? "✓" : n}</span>
              <span style={{ fontSize: 13, color: active ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: active ? 500 : 400 }}>{l}</span>
            </div>
            {i < labels.length - 1 && <div style={{ flex: 1, height: 1, background: "var(--divider)" }}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepContact({ data, set, onNext }) {
  function autoCEP(v) {
    const clean = v.replace(/\D/g,"").slice(0,8);
    set("cep", clean.length > 5 ? clean.slice(0,5)+"-"+clean.slice(5) : clean);
    if (clean.length === 8) {
      // mock ViaCEP
      set("street", "Rua das Joalherias"); set("city", "São Paulo"); set("uf", "SP");
    }
  }
  return (
    <div>
      <h2 style={{ fontSize: 32, margin: "0 0 6px" }}>Quem vai receber?</h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: 28 }}>Já tem conta? <a style={{borderBottom:"1px solid currentColor", cursor:"pointer"}}>Entre aqui</a></p>

      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <SocialBtn>Continuar com Google</SocialBtn>
        <SocialBtn>Continuar com Apple</SocialBtn>
      </div>
      <Divider label="ou continue como visitante"/>

      <Grid>
        <Field label="Email" full><input value={data.email} onChange={e=>set("email", e.target.value)} placeholder="seu@email.com" style={inp}/></Field>
        <Field label="CEP"><input value={data.cep} onChange={e=>autoCEP(e.target.value)} placeholder="00000-000" style={inp}/></Field>
        <Field label="Cidade / UF"><input value={data.city ? `${data.city} / ${data.uf}` : ""} disabled style={{...inp, color:"var(--text-secondary)"}}/></Field>
        <Field label="Rua" full><input value={data.street} onChange={e=>set("street", e.target.value)} style={inp}/></Field>
        <Field label="Número"><input value={data.number} onChange={e=>set("number", e.target.value)} style={inp}/></Field>
        <Field label="Complemento"><input value={data.complement} onChange={e=>set("complement", e.target.value)} placeholder="opcional" style={inp}/></Field>
      </Grid>

      <div style={{ marginTop: 36 }}><Button onClick={onNext} full>Continuar para frete</Button></div>
    </div>
  );
}

function StepShipping({ data, set, onBack, onNext }) {
  const opts = [
    { id: "sedex",  name: "Sedex",  days: "2 a 4 dias úteis", cost: 32 },
    { id: "pac",    name: "PAC",    days: "5 a 8 dias úteis", cost: 18 },
    { id: "jadlog", name: "Jadlog", days: "3 a 6 dias úteis", cost: 22 },
  ];
  return (
    <div>
      <h2 style={{ fontSize: 32, margin: "0 0 28px" }}>Como prefere receber?</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opts.map(o => (
          <label key={o.id} style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
            padding: "16px 20px", background: "var(--surface)", borderRadius: 8, cursor: "pointer",
            border: "1px solid " + (data.shipping?.id === o.id ? "var(--text-primary)" : "var(--divider)"),
          }}>
            <input type="radio" checked={data.shipping?.id === o.id} onChange={()=>set("shipping", o)}/>
            <div>
              <div style={{ fontWeight: 500 }}>{o.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{o.days}</div>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{formatBRL(o.cost)}</div>
          </label>
        ))}
      </div>
      <a style={{ fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid currentColor", display: "inline-block", marginTop: 18, cursor: "pointer" }}>Calcular outras transportadoras</a>
      <div style={{ display: "flex", gap: 10, marginTop: 36 }}>
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext} disabled={!data.shipping}>Continuar para pagamento</Button>
      </div>
    </div>
  );
}

function StepPayment({ data, set, onBack, onNext, total }) {
  return (
    <div>
      <h2 style={{ fontSize: 32, margin: "0 0 28px" }}>Pagamento</h2>
      <div style={{ display: "flex", borderBottom: "1px solid var(--divider)", marginBottom: 28 }}>
        {["pix","credit","boleto"].map(t => (
          <button key={t} onClick={()=>set("payment", t)}
            style={{ background: "none", border: "none", padding: "12px 20px", cursor: "pointer",
                     fontSize: 14, color: data.payment === t ? "var(--text-primary)" : "var(--text-secondary)",
                     borderBottom: "2px solid " + (data.payment === t ? "var(--text-primary)" : "transparent"),
                     marginBottom: -1, fontWeight: data.payment === t ? 500 : 400 }}>
            {t === "pix" ? "Pix · 5% off" : t === "credit" ? "Cartão" : "Boleto"}
          </button>
        ))}
      </div>

      {data.payment === "pix" && (
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div style={{ width: 140, height: 140, background: "#fff", display: "grid", placeItems: "center", border: "1px solid var(--divider)" }}>
              <QRCode/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>Chave Pix</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: 10, background: "var(--bg)", borderRadius: 4, wordBreak: "break-all" }}>00020126580014BR.GOV.BCB.PIX0136abc-def-ghi5204000053039865802BR</div>
              <button style={{ background: "none", border: "1px solid var(--text-primary)", padding: "8px 14px", marginTop: 10, fontSize: 13, cursor: "pointer", borderRadius: 4 }}>Copiar chave</button>
              <div style={{ fontSize: 12, color: "var(--success)", marginTop: 10 }}>5% de desconto aplicado</div>
            </div>
          </div>
        </div>
      )}

      {data.payment === "credit" && (
        <Grid>
          <Field label="Número" full><input value={data.cardNum} onChange={e=>set("cardNum", e.target.value)} placeholder="0000 0000 0000 0000" style={inp}/></Field>
          <Field label="Nome no cartão" full><input value={data.cardName} onChange={e=>set("cardName", e.target.value)} style={inp}/></Field>
          <Field label="Validade"><input value={data.cardExp} onChange={e=>set("cardExp", e.target.value)} placeholder="MM/AA" style={inp}/></Field>
          <Field label="CVV"><input value={data.cardCvv} onChange={e=>set("cardCvv", e.target.value)} placeholder="000" style={inp}/></Field>
          <Field label="Parcelas" full>
            <select value={data.parcelas} onChange={e=>set("parcelas", +e.target.value)} style={inp}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}× de {formatBRL(total/n)} sem juros</option>)}
            </select>
          </Field>
        </Grid>
      )}

      {data.payment === "boleto" && (
        <div style={{ background: "var(--surface)", padding: 24, borderRadius: 8 }}>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>O boleto será gerado após a confirmação. <strong style={{color:"var(--text-primary)"}}>Compensação em até 2 dias úteis</strong> — seu pedido começa a ser preparado depois disso.</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 36 }}>
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext}>Finalizar pedido</Button>
      </div>
    </div>
  );
}

function StepConfirm({ go }) {
  const num = "PED-" + (Math.floor(Math.random()*900000) + 100000);
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ width: 72, height: 72, borderRadius: 999, background: "#EEF2E8", color: "var(--success)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
        <Icon name="check" size={32}/>
      </div>
      <h1 style={{ fontSize: 44, margin: 0 }}>Pedido confirmado.</h1>
      <p style={{ fontSize: 17, color: "var(--text-secondary)", marginTop: 12 }}>Recebemos seu pedido <strong style={{color:"var(--text-primary)"}}>{num}</strong>. Enviamos um email com os detalhes.</p>

      <div style={{ background: "var(--surface)", borderRadius: 8, padding: 28, marginTop: 36, textAlign: "left", maxWidth: 500, marginInline: "auto" }}>
        <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 14 }}>Próximos passos</div>
        <Step n="1" t="Pagamento" d="Aguardamos a confirmação do Pix"/>
        <Step n="2" t="Preparação" d="Sua peça é finalizada à mão · 3-5 dias úteis"/>
        <Step n="3" t="Envio" d="Você recebe o código de rastreio por email"/>
        <Step n="4" t="Entrega" d="Em embalagem presente"/>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 36 }}>
        <Button onClick={()=>go({ name:"account-orders" })}>Acompanhar pedido</Button>
        <Button variant="ghost" onClick={()=>go({ name:"home" })}>Continuar comprando</Button>
      </div>
    </div>
  );
}

function Step({ n, t, d }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: 14, padding: "10px 0" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--accent)" }}>{n}</div>
      <div>
        <div style={{ fontWeight: 500 }}>{t}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{d}</div>
      </div>
    </div>
  );
}

function CheckoutSummary({ items, subtotal, shipping, pixDiscount, total, step }) {
  return (
    <aside style={{ background: "var(--surface)", padding: 28, borderRadius: 8, position: "sticky", top: 100 }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: "0 0 18px" }}>Seu pedido</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 18, borderBottom: "1px solid var(--divider)" }}>
        {items.map((it, idx) => {
          const p = CATALOG.find(x=>x.id===it.id); if (!p) return null;
          return (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, alignItems: "center" }}>
              <div style={{ aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 4, overflow: "hidden" }}>
                <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              </div>
              <div>
                <div style={{ fontSize: 13, fontFamily: "var(--font-display)" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{it.material.replace("-"," ")} · {it.qty}×</div>
              </div>
              <div style={{ fontSize: 13 }}>{formatBRL(p.price * it.qty)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ paddingTop: 18, fontSize: 14 }}>
        <Row k="Subtotal" v={formatBRL(subtotal)}/>
        <Row k="Frete" v={shipping ? formatBRL(shipping.cost) : "—"}/>
        {pixDiscount > 0 && <Row k="Desconto Pix" v={"– "+formatBRL(pixDiscount)} accent/>}
        <div style={{ borderTop: "1px solid var(--divider)", marginTop: 12, paddingTop: 12 }}>
          <Row k="Total" v={formatBRL(total)} bold/>
        </div>
      </div>
    </aside>
  );
}

function Row({ k, v, bold, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0",
                  fontSize: bold ? 18 : 14, fontFamily: bold ? "var(--font-display)" : "var(--font-body)",
                  color: accent ? "var(--success)" : "var(--text-primary)" }}>
      <span style={{ color: bold || accent ? undefined : "var(--text-secondary)" }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

const inp = { width: "100%", padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--divider)", borderRadius: 2, fontSize: 14, fontFamily: "var(--font-body)", outline: "none" };
function Grid({ children }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>; }
function Field({ label, full, children }) {
  return (
    <div style={{ gridColumn: full ? "span 2" : "auto" }}>
      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
function SocialBtn({ children }) {
  return <button style={{ flex: 1, padding: "12px", background: "var(--surface)", border: "1px solid var(--divider)", borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)", color: "var(--text-primary)" }}>{children}</button>;
}
function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--text-muted)", fontSize: 12, margin: "20px 0 24px" }}>
      <div style={{ flex: 1, height: 1, background: "var(--divider)" }}/>{label}<div style={{ flex: 1, height: 1, background: "var(--divider)" }}/>
    </div>
  );
}
function QRCode() {
  // simple visual placeholder
  return (
    <svg width="120" height="120" viewBox="0 0 21 21">
      {Array.from({length: 21*21}).map((_, i) => {
        const x = i % 21, y = Math.floor(i/21);
        const corner = (x<7&&y<7) || (x>13&&y<7) || (x<7&&y>13);
        const dot = corner ? ((x===0||x===6||y===0||y===6||x===14||x===20||(x>=2&&x<=4&&y>=2&&y<=4)||(x>=16&&x<=18&&y>=2&&y<=4)||(x>=2&&x<=4&&y>=16&&y<=18))) : ((x*7+y*11)%3===0);
        return dot ? <rect key={i} x={x} y={y} width="1" height="1" fill="#1A1612"/> : null;
      })}
    </svg>
  );
}
