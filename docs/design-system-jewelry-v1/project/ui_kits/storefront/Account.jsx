// Account.jsx — 5 client area screens + Tracking + Wishlist+
const { useState: _useStateAcc } = React;

window.AccountHome = function AccountHome({ go }) {
  return (
    <AccountLayout go={go} active="home">
      <h1 style={{ fontSize: 36, margin: 0 }}>Olá, Maria.</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 6 }}>Bom te ver de volta.</p>

      <ProactiveCard go={go}/>

      <Section title="Último pedido">
        <OrderRowMini num="PED-184722" date="12 abr · ouro 18k Aliança Solitário" status="A caminho" go={go}/>
      </Section>

      <Section title="Atalhos">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <Shortcut icon="bag"   t="Pedidos"   d="ver histórico" onClick={()=>go({ name:"account-orders" })}/>
          <Shortcut icon="heart" t="Wishlist"  d="3 peças salvas" onClick={()=>go({ name:"wishlist" })}/>
          <Shortcut icon="gift"  t="Gift cards" d="comprar ou resgatar"/>
        </div>
      </Section>
    </AccountLayout>
  );
};

function ProactiveCard({ go }) {
  return (
    <div style={{ background: "var(--accent-soft)", padding: 24, borderRadius: 8, marginTop: 32, display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 18, alignItems: "center" }}>
      <div style={{ aspectRatio: "1/1", background: "#fff", borderRadius: 4, overflow: "hidden" }}>
        <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
      </div>
      <div>
        <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accent)" }}>Sugestão</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 4 }}>Está na hora de repor sua Pulseira Trama?</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Você comprou em jan/26 — clientes costumam recomprar depois de 12 meses.</div>
      </div>
      <Button onClick={()=>go({ name:"pdp", id:4 })}>Ver peça</Button>
    </div>
  );
}

function Shortcut({ icon, t, d, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "var(--surface)", padding: 18, borderRadius: 8, border: "1px solid var(--divider)", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ color: "var(--accent)" }}><Icon name={icon}/></span>
      <div style={{ fontWeight: 500 }}>{t}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d}</div>
    </button>
  );
}

window.AccountOrders = function AccountOrders({ go }) {
  const [open, setOpen] = _useStateAcc(null);
  const orders = [
    { num: "PED-184722", date: "12 abr 2026", total: 2890, status: "A caminho",   tracking: "BR123456789", items: [{ name: "Aliança Solitário", desc: "ouro 18k · aro 14" }] },
    { num: "PED-179023", date: "08 jan 2026", total: 1290, status: "Entregue",    tracking: "BR987654321", items: [{ name: "Pulseira Trama", desc: "ouro 18k" }] },
    { num: "PED-168204", date: "23 nov 2025", total: 480,  status: "Entregue",    tracking: "BR555444333", items: [{ name: "Brinco Linha", desc: "prata 925" }] },
    { num: "PED-155901", date: "14 jul 2025", total: 1450, status: "Trocado",     tracking: "BR111222333", items: [{ name: "Colar Gota", desc: "ouro branco" }] },
  ];
  return (
    <AccountLayout go={go} active="orders">
      <h1 style={{ fontSize: 36, margin: 0 }}>Pedidos</h1>
      <div style={{ display: "flex", gap: 8, marginTop: 24, marginBottom: 18 }}>
        {["Todos","A caminho","Entregues","Trocas"].map((f,i)=>(
          <button key={f} style={{ padding: "8px 14px", fontSize: 13, borderRadius: 999, border: "1px solid var(--divider)",
            background: i===0 ? "var(--text-primary)" : "var(--surface)", color: i===0 ? "#fff" : "var(--text-primary)", cursor: "pointer" }}>{f}</button>
        ))}
      </div>
      <div style={{ background: "var(--surface)", borderRadius: 8 }}>
        {orders.map((o, i) => (
          <button key={o.num} onClick={()=>setOpen(o)} style={{
            width: "100%", display: "grid", gridTemplateColumns: "120px 1fr 100px 110px 16px",
            gap: 16, alignItems: "center", padding: "18px 20px",
            background: "transparent", border: "none", borderTop: i===0?"none":"1px solid var(--divider)",
            cursor: "pointer", textAlign: "left", color: "var(--text-primary)", fontFamily: "var(--font-body)",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{o.num}</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{o.items[0].name} · {o.date}</span>
            <span style={{ fontSize: 13 }}>{formatBRL(o.total)}</span>
            <StatusPill status={o.status}/>
            <Icon name="chevron" size={14}/>
          </button>
        ))}
      </div>
      {open && <OrderDrawer order={open} onClose={()=>setOpen(null)} go={go}/>}
    </AccountLayout>
  );
};

function StatusPill({ status }) {
  const map = {
    "A caminho":  { bg: "#F6EEDC", c: "#B8853A" },
    "Entregue":   { bg: "#EEF2E8", c: "#5C7A4A" },
    "Trocado":    { bg: "#F4F4F2", c: "#6B6055" },
    "Aguardando": { bg: "#F4E6E6", c: "#A84444" },
  };
  const s = map[status] || map["Entregue"];
  return <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: s.bg, color: s.c, fontWeight: 500 }}>{status}</span>;
}

function OrderDrawer({ order, onClose, go }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,22,18,0.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width: 540, height: "100%", background: "var(--bg)", padding: 32, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>{order.num}</div>
            <h2 style={{ fontSize: 26, margin: "6px 0" }}>{order.items[0].name}</h2>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{order.date} · {formatBRL(order.total)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)" }}><Icon name="close"/></button>
        </div>

        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 14 }}>Status</div>
          <Timeline status={order.status}/>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
          <Button onClick={()=>go({ name:"tracking", num: order.num })}>Rastrear · {order.tracking}</Button>
          <Button variant="ghost">Abrir troca</Button>
        </div>

        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 14 }}>Documentos</div>
          <div style={{ display: "flex", gap: 10 }}>
            <DocBtn>NF-e (PDF)</DocBtn>
            <DocBtn>NF-e (XML)</DocBtn>
            <DocBtn>Recibo</DocBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocBtn({ children }) { return <button style={{ padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--divider)", borderRadius: 4, fontSize: 13, cursor: "pointer", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>↓ {children}</button>; }

function Timeline({ status }) {
  const steps = [
    { l: "Pagamento confirmado", date: "12 abr · 14:22" },
    { l: "Em produção",           date: "13 abr · 09:10" },
    { l: "Postado",               date: "16 abr · 17:30" },
    { l: "Em trânsito",           date: "17 abr · 08:00", current: status === "A caminho" },
    { l: "Entregue",              date: status === "Entregue" ? "20 abr · 11:42" : "previsto 22 abr", future: status !== "Entregue" },
  ];
  return (
    <div>
      {steps.map((s, i) => {
        const future = s.future && !s.current;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 14, alignItems: "flex-start", paddingBottom: 14, position: "relative" }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, marginTop: 4,
              background: future ? "transparent" : "var(--accent)",
              border: "1.5px solid " + (future ? "var(--divider)" : "var(--accent)") }}/>
            {i < steps.length - 1 && <div style={{ position: "absolute", left: 5, top: 16, bottom: 0, width: 2, background: future ? "var(--divider)" : "var(--accent)" }}/>}
            <div>
              <div style={{ fontWeight: s.current ? 500 : 400, color: future ? "var(--text-muted)" : "var(--text-primary)" }}>{s.l}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.date}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.AccountWarranty = function AccountWarranty({ go }) {
  const items = [
    { name: "Aliança Solitário",  date: "12 abr 2026", days: 350, status: "ativa" },
    { name: "Pulseira Trama",     date: "08 jan 2026", days: 18,  status: "expira" },
    { name: "Brinco Linha",       date: "23 nov 2024", days: 0,   status: "expirada" },
  ];
  return (
    <AccountLayout go={go} active="warranty">
      <h1 style={{ fontSize: 36, margin: 0 }}>Garantias</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 6, marginBottom: 28 }}>Cobertura contra defeitos de fabricação · 1 ano a partir da compra</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto auto", gap: 16, alignItems: "center", background: "var(--surface)", padding: 18, borderRadius: 8 }}>
            <div style={{ aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 4, overflow: "hidden" }}>
              <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{it.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>comprado {it.date}</div>
            </div>
            <WarrantyStatus s={it}/>
            <button style={{ padding: "8px 14px", fontSize: 13, background: "transparent", border: "1px solid var(--text-primary)", borderRadius: 4, cursor: "pointer", color: "var(--text-primary)" }}>
              {it.status === "expirada" ? "Recomprar" : "Renovar"}
            </button>
          </div>
        ))}
      </div>
    </AccountLayout>
  );
};

function WarrantyStatus({ s }) {
  if (s.status === "ativa") return <div style={{ fontSize: 12 }}><span style={{ color: "var(--success)", fontWeight: 500 }}>● Ativa</span><div style={{ color: "var(--text-muted)" }}>{s.days} dias restantes</div></div>;
  if (s.status === "expira") return <div style={{ fontSize: 12 }}><span style={{ color: "#B8853A", fontWeight: 500 }}>● Expira em {s.days} dias</span><div style={{ color: "var(--text-muted)" }}>renovação +R$ 49</div></div>;
  return <div style={{ fontSize: 12 }}><span style={{ color: "var(--text-muted)", fontWeight: 500 }}>● Expirada</span></div>;
}

window.AccountAddresses = function AccountAddresses({ go }) {
  const [list, setList] = _useStateAcc([
    { id: 1, label: "Casa", street: "Rua das Joalherias, 142", city: "São Paulo / SP", cep: "04534-000", default: true },
    { id: 2, label: "Trabalho", street: "Av. Paulista, 1000 — sala 102", city: "São Paulo / SP", cep: "01310-100", default: false },
  ]);
  return (
    <AccountLayout go={go} active="addresses">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 36, margin: 0 }}>Endereços</h1>
        <Button>+ Adicionar</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginTop: 28 }}>
        {list.map(a => (
          <div key={a.id} style={{ background: "var(--surface)", padding: 22, borderRadius: 8, position: "relative" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{a.label}</span>
              {a.default && <span style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)", border: "1px solid var(--accent)", padding: "2px 8px", borderRadius: 999 }}>Padrão</span>}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {a.street}<br/>{a.city} · {a.cep}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <a style={{ fontSize: 13, borderBottom: "1px solid currentColor", cursor: "pointer" }}>Editar</a>
              <a style={{ fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid currentColor", cursor: "pointer" }}>Remover</a>
            </div>
          </div>
        ))}
      </div>
    </AccountLayout>
  );
};

window.AccountProfile = function AccountProfile({ go }) {
  return (
    <AccountLayout go={go} active="profile">
      <h1 style={{ fontSize: 36, margin: 0 }}>Dados pessoais</h1>
      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 720 }}>
        <Field label="Nome" full><input defaultValue="Maria Silveira" style={inp}/></Field>
        <Field label="Email" full><input defaultValue="maria@email.com" style={inp}/></Field>
        <Field label="Telefone"><input defaultValue="(11) 98888-1212" style={inp}/></Field>
        <Field label="CPF"><input defaultValue="123.456.789-00" style={inp}/></Field>
        <Field label="Nascimento"><input defaultValue="14/03/1992" style={inp}/></Field>
      </div>

      <h2 style={{ fontSize: 22, marginTop: 48, marginBottom: 16 }}>Comunicação</h2>
      <div style={{ background: "var(--surface)", padding: 20, borderRadius: 8, maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
        <Toggle label="Lançamentos por email" sub="máx 1 email por semana" defaultChecked/>
        <Toggle label="Confirmações WhatsApp" sub="status do pedido em tempo real" defaultChecked/>
        <Toggle label="SMS promocional" sub="apenas datas comemorativas"/>
      </div>

      <div style={{ marginTop: 36, display: "flex", gap: 12 }}>
        <Button>Salvar alterações</Button>
        <Button variant="ghost">Sair da conta</Button>
      </div>
    </AccountLayout>
  );
};

function Toggle({ label, sub, defaultChecked }) {
  const [on, set] = _useStateAcc(!!defaultChecked);
  return (
    <label style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", cursor: "pointer" }}>
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{sub}</div>
      </div>
      <button onClick={(e)=>{e.preventDefault(); set(!on);}} style={{
        width: 44, height: 24, borderRadius: 999, background: on ? "var(--accent)" : "var(--divider)",
        border: "none", position: "relative", cursor: "pointer", transition: "background 200ms",
      }}>
        <span style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: 999, background: "#fff", transition: "left 200ms" }}/>
      </button>
    </label>
  );
}

function AccountLayout({ go, active, children }) {
  const nav = [
    { id: "home",       label: "Início",     route: "account-home" },
    { id: "orders",     label: "Pedidos",    route: "account-orders" },
    { id: "warranty",   label: "Garantias",  route: "account-warranty" },
    { id: "wishlist",   label: "Wishlist",   route: "wishlist" },
    { id: "addresses",  label: "Endereços",  route: "account-addresses" },
    { id: "profile",    label: "Dados",      route: "account-profile" },
  ];
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px var(--container-pad) 0", display: "grid", gridTemplateColumns: "240px 1fr", gap: 56 }}>
      <aside>
        <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 16 }}>Minha conta</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map(n => (
            <a key={n.id} onClick={()=>go({ name: n.route })}
               style={{
                 padding: "10px 14px", borderRadius: 4, cursor: "pointer", fontSize: 14,
                 background: active === n.id ? "var(--surface)" : "transparent",
                 color: active === n.id ? "var(--text-primary)" : "var(--text-secondary)",
                 fontWeight: active === n.id ? 500 : 400,
               }}>{n.label}</a>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}

function OrderRowMini({ num, date, status, go }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 18, alignItems: "center", padding: 18, background: "var(--surface)", borderRadius: 8 }}>
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>{num}</div>
        <div style={{ fontSize: 14, marginTop: 4 }}>{date}</div>
      </div>
      <StatusPill status={status}/>
      <Button variant="ghost" onClick={()=>go({ name: "account-orders" })}>Detalhes</Button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: "0 0 16px" }}>{title}</h2>
      {children}
    </div>
  );
}

window.Tracking = function Tracking({ num, go }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px var(--container-pad) 0" }}>
      <a onClick={()=>go({ name:"account-orders" })} style={{ fontSize: 13, color: "var(--text-secondary)", display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer", marginBottom: 24 }}>
        <Icon name="chevron-left" size={14}/> Voltar para pedidos
      </a>
      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Rastreio</div>
      <h1 style={{ fontSize: 44, margin: "8px 0 0" }}>Sua peça está a caminho.</h1>
      <p style={{ fontSize: 17, color: "var(--text-secondary)", marginTop: 12 }}>Pedido <strong style={{color:"var(--text-primary)"}}>{num || "PED-184722"}</strong> · previsão de entrega <strong style={{color:"var(--text-primary)"}}>22 abr</strong></p>

      <div style={{ marginTop: 40, background: "var(--surface)", padding: 32, borderRadius: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: 32 }}>
          {["Postado","Em trânsito","Entregue"].map((l, i) => {
            const done = i === 0; const current = i === 1;
            return (
              <div key={l} style={{ textAlign: "center", position: "relative", paddingTop: 36 }}>
                <div style={{ position: "absolute", top: 12, left: 0, right: 0, height: 2, background: i === 0 ? "var(--accent)" : "var(--divider)" }}/>
                <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", width: 18, height: 18, borderRadius: 999,
                  background: done || current ? "var(--accent)" : "var(--surface)",
                  border: "2px solid " + (done || current ? "var(--accent)" : "var(--divider)") }}/>
                <div style={{ fontWeight: current ? 500 : 400, color: done || current ? "var(--text-primary)" : "var(--text-muted)" }}>{l}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{i === 0 ? "16 abr" : i === 1 ? "previsto 19 abr" : "previsto 22 abr"}</div>
              </div>
            );
          })}
        </div>

        <div style={{ aspectRatio: "16/7", background: "#F4F1E9", borderRadius: 6, position: "relative", overflow: "hidden" }}>
          <svg width="100%" height="100%" viewBox="0 0 800 350" preserveAspectRatio="xMidYMid slice">
            <defs><pattern id="dotmap" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#A89B8C" opacity="0.4"/></pattern></defs>
            <rect width="800" height="350" fill="url(#dotmap)"/>
            <path d="M120 240 Q 360 80 660 130" stroke="#B8956A" strokeWidth="2" fill="none" strokeDasharray="6 6"/>
            <circle cx="120" cy="240" r="8" fill="#1A1612"/>
            <circle cx="660" cy="130" r="8" fill="#fff" stroke="#1A1612" strokeWidth="2"/>
            <text x="120" y="270" textAnchor="middle" fontSize="11" fill="#6B6055" fontFamily="Inter">São Paulo</text>
            <text x="660" y="120" textAnchor="middle" fontSize="11" fill="#6B6055" fontFamily="Inter">Rio de Janeiro</text>
          </svg>
        </div>

        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>Histórico</div>
          {[
            { t: "Saiu para entrega no centro de distribuição RJ", date: "17 abr · 08:14" },
            { t: "Em trânsito · Rio de Janeiro / RJ", date: "17 abr · 06:02" },
            { t: "Postado · São Paulo / SP", date: "16 abr · 17:33" },
            { t: "Pedido em produção", date: "13 abr · 09:10" },
          ].map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--divider)", fontSize: 14 }}>
              <span>{e.t}</span><span style={{ color: "var(--text-muted)", fontSize: 12 }}>{e.date}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
          <Button variant="ghost">Falar com atendimento</Button>
          <Button variant="link">Ver pedido completo →</Button>
        </div>
      </div>
    </div>
  );
};

window.WishlistPro = function WishlistPro({ wish, onWish, wished, go }) {
  const items = CATALOG.filter(p => wish.includes(p.id));
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px var(--container-pad) 0" }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>Lista de desejos</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>{items.length} peça(s)</p>
      {items.length === 0
        ? <EmptyState icon="heart" title="Sua lista está vazia" desc="Toque o ♥ em qualquer peça para salvar." cta="Ver coleção" onCta={()=>go({ name:"plp", category: null })}/>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {items.map((p, i) => (
              <div key={p.id} style={{ position: "relative" }}>
                <ProductCard p={p} onOpen={(id)=>go({ name: "pdp", id })} onWish={onWish} wished={wished.includes(p.id)}/>
                {i === 0 && <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, background: "var(--success)", color: "#fff", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999 }}>Voltou ao estoque</span>}
                {i === 2 && <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, background: "var(--text-primary)", color: "#fff", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999 }}>Em promoção</span>}
              </div>
            ))}
          </div>
      }
    </div>
  );
};
