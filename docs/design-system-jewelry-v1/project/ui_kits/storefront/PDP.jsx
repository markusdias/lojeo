// PDP.jsx — product detail with gallery, variants, niche fields, reviews, slots
const { useState: _useStatePDP } = React;

window.PDP = function PDP({ id, go, onAddCart, onWish, wished, urgency }) {
  const p = CATALOG.find(x => x.id === id) || CATALOG[0];
  const [imgIdx, setImgIdx] = _useStatePDP(0);
  const [size, setSize] = _useStatePDP(p.cat === "aneis" ? 14 : (p.cat === "colares" ? 45 : null));
  const [material, setMaterial] = _useStatePDP(p.material);
  const [closure, setClosure] = _useStatePDP("tarraxa");
  const images = [0,1,2,3];

  const isOut = id === 9; // demo: ear cuff is out of stock
  const variantBlock = (
    <VariantPicker p={p} size={size} setSize={setSize} closure={closure} setClosure={setClosure}/>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px var(--container-pad) 0" }}>
      <Breadcrumbs go={go} p={p}/>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 80, marginTop: 32 }}>
        <Gallery imgIdx={imgIdx} setImgIdx={setImgIdx} images={images}/>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>
            {CATEGORIES.find(c => c.slug === p.cat)?.label}
          </div>
          <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.05 }}>{p.name}</h1>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <Stars value={5}/>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>4.9 · 142 avaliações</span>
          </div>

          <div style={{ fontSize: 28, fontFamily: "var(--font-display)", marginTop: 28 }}>{formatBRL(p.price)}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>ou 6× de {formatBRL(p.price/6)} sem juros</div>

          <UrgencyBadge urgency={urgency}/>

          <div style={{ marginTop: 32 }}>
            <Label>Material</Label>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {MATERIALS.map(m => (
                <button key={m.slug} onClick={() => setMaterial(m.slug)}
                        title={m.label}
                        style={{
                          width: 36, height: 36, borderRadius: 999, background: m.swatch,
                          border: "1px solid var(--divider)", cursor: "pointer",
                          outline: material === m.slug ? "1.5px solid var(--text-primary)" : "none",
                          outlineOffset: 2,
                        }}/>
              ))}
            </div>
          </div>

          {variantBlock}

          <div style={{ marginTop: 36, display: "flex", gap: 10 }}>
            {isOut
              ? <Button variant="ghost" full>Avise-me quando voltar</Button>
              : <>
                  <Button onClick={() => onAddCart({ id: p.id, size, material })} full>Adicionar à sacola</Button>
                  <button onClick={() => onWish(p.id)} aria-label="favoritar"
                          style={{ width: 50, background: "var(--surface)", border: "1px solid var(--text-primary)", borderRadius: 8, cursor: "pointer", color: wished.includes(p.id) ? "var(--accent)" : "var(--text-primary)", display: "grid", placeItems: "center" }}>
                    <Icon name={wished.includes(p.id) ? "heart-filled" : "heart"}/>
                  </button>
                </>
            }
          </div>

          <NicheFields p={p}/>

          <Description/>
        </div>
      </div>

      <Reviews/>
      <FBTSlot p={p} go={go}/>
      <RelatedSlot title="Você também pode gostar" go={go} onWish={onWish} wished={wished}/>
      <UGCSlot/>
      <ChatbotFAB/>
    </div>
  );
};

function Breadcrumbs({ go, p }) {
  return (
    <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 8, alignItems: "center" }}>
      <a onClick={() => go({ name: "home" })} style={{ cursor: "pointer" }}>Home</a> ·
      <a onClick={() => go({ name: "plp", category: p.cat })} style={{ cursor: "pointer" }}>{CATEGORIES.find(c => c.slug === p.cat)?.label}</a> ·
      <span style={{ color: "var(--text-primary)" }}>{p.name}</span>
    </div>
  );
}

function Gallery({ imgIdx, setImgIdx, images }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 16, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {images.map(i => (
          <button key={i} onClick={() => setImgIdx(i)}
                  style={{
                    aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 4, overflow: "hidden",
                    border: imgIdx === i ? "1.5px solid var(--text-primary)" : "1px solid var(--divider)",
                    padding: 0, cursor: "pointer",
                  }}>
            <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          </button>
        ))}
      </div>
      <div style={{ position: "relative", aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 8, overflow: "hidden" }}>
        <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        <button style={{ position: "absolute", bottom: 16, right: 16, width: 44, height: 44, borderRadius: 999, background: "rgba(255,255,255,0.95)", border: "none", cursor: "pointer", color: "var(--text-primary)", display: "grid", placeItems: "center" }}>
          <Icon name="zoom" size={18}/>
        </button>
      </div>
    </div>
  );
}

function UrgencyBadge({ urgency }) {
  // Apenas dados REAIS de telemetria. Estados: "none" | "viewing" | "low-stock"
  if (urgency === "viewing") return (
    <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", background: "var(--surface)", padding: "6px 12px", borderRadius: 999 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--success)", animation: "pulse 2s infinite" }}/>
      12 pessoas vendo agora
    </div>
  );
  if (urgency === "low-stock") return (
    <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#A84444", background: "#F4E6E6", padding: "6px 12px", borderRadius: 999, fontWeight: 500 }}>
      Restam apenas 3 unidades
    </div>
  );
  return null;
}

function VariantPicker({ p, size, setSize, closure, setClosure }) {
  if (p.cat === "aneis") return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Label>Aro</Label>
        <a style={{ fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid currentColor", cursor: "pointer" }}>Como medir meu aro</a>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {[12,13,14,15,16,17,18,19,20,21,22].map(s => (
          <button key={s} onClick={() => setSize(s)} disabled={s === 22}
            style={variantBtn(size === s, s === 22)}>{s}</button>
        ))}
      </div>
    </div>
  );
  if (p.cat === "colares") return (
    <div style={{ marginTop: 24 }}>
      <Label>Comprimento da corrente</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {[40,45,50,60].map(s => (
          <button key={s} onClick={() => setSize(s)} style={variantBtn(size === s, false)}>{s} cm</button>
        ))}
      </div>
    </div>
  );
  if (p.cat === "brincos") return (
    <div style={{ marginTop: 24 }}>
      <Label>Tipo de fecho</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {[
          { id: "tarraxa", l: "Tarraxa" },
          { id: "argola", l: "Argola" },
          { id: "ingles", l: "Inglês" },
        ].map(o => (
          <button key={o.id} onClick={() => setClosure(o.id)} style={variantBtn(closure === o.id, false)}>{o.l}</button>
        ))}
      </div>
    </div>
  );
  return null;
}
function variantBtn(active, disabled) {
  return {
    padding: "10px 14px", fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", borderRadius: 2,
    background: "var(--surface)",
    color: disabled ? "var(--text-muted)" : "var(--text-primary)",
    textDecoration: disabled ? "line-through" : "none",
    border: "1px solid " + (active ? "var(--text-primary)" : "var(--divider)"),
    borderWidth: active ? 1.5 : 1,
    fontFamily: "var(--font-body)",
  };
}

function NicheFields({ p }) {
  const rows = [
    { k: "Material",    v: "Ouro 18k · acabamento polido" },
    { k: "Pedra",       v: p.stone || "—" },
    { k: "Quilate",     v: p.stone === "diamante" ? "0,15ct" : "—" },
    { k: "Origem",      v: "Brasil · ateliê em São Paulo" },
    { k: "Garantia",    v: "1 ano contra defeitos de fabricação" },
    { k: "Embalagem",   v: "Caixa Atelier inclusa" },
  ];
  return (
    <dl style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--divider)", fontSize: 13 }}>
      {rows.map(r => (
        <div key={r.k} style={{ display: "grid", gridTemplateColumns: "120px 1fr", padding: "10px 0", borderBottom: "1px solid var(--divider)" }}>
          <dt style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>{r.k}</dt>
          <dd style={{ margin: 0, color: "var(--text-primary)" }}>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Description() {
  return (
    <div style={{ marginTop: 36 }}>
      <Label>Sobre a peça</Label>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.65, marginTop: 12 }}>
        Aliança em ouro 18k com acabamento polido espelhado. Cada peça é finalizada à mão pelo nosso ateliê em São Paulo. Personalize com gravação interna sem custo adicional.
      </p>
    </div>
  );
}

function Reviews() {
  return (
    <section style={{ marginTop: 120 }}>
      <SectionHeader eyebrow="Avaliações" title="O que dizem"/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {[
          { author: "Carolina M.", city: "São Paulo", quote: "Ficou ainda mais bonita que na foto.", body: "A peça chegou em embalagem caprichada e o acabamento fosco é tudo que eu esperava. Uso todos os dias." },
          { author: "Beatriz R.",  city: "Rio de Janeiro", quote: "Atendimento impecável.", body: "Pedi gravação personalizada, chegou no prazo. O detalhe da nota escrita à mão na embalagem fez diferença." },
        ].map(r => (
          <div key={r.author} style={{ background: "var(--surface)", padding: 24, borderRadius: 8, display: "grid", gridTemplateColumns: "100px 1fr", gap: 18 }}>
            <div style={{ aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 4, overflow: "hidden" }}>
              <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            </div>
            <div>
              <Stars/>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0" }}>{r.author} · {r.city}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontStyle: "italic", lineHeight: 1.3, marginTop: 4 }}>"{r.quote}"</div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5 }}>{r.body}</p>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--success)", marginTop: 8 }}>✓ Compra verificada</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SlotMark({ label }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent)" }}/>
      Slot reservado · {label}
    </div>
  );
}

function FBTSlot({ p, go }) {
  const a = p; const b = CATALOG.find(x => x.id !== p.id && x.cat === p.cat) || CATALOG[1];
  const total = a.price + b.price;
  return (
    <section style={{ marginTop: 120 }}>
      <SlotMark label="frequentemente comprado junto · IA Core"/>
      <SectionHeader eyebrow="Combine" title="Frequentemente comprado junto"/>
      <div style={{ background: "var(--surface)", padding: 28, borderRadius: 8, display: "grid", gridTemplateColumns: "auto auto auto 1fr auto", gap: 18, alignItems: "center" }}>
        <ComboItem p={a}/>
        <div style={{ fontSize: 24, color: "var(--text-muted)" }}>+</div>
        <ComboItem p={b}/>
        <div style={{ paddingLeft: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Total combinado</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 4 }}>{formatBRL(total)}</div>
          <div style={{ fontSize: 12, color: "var(--success)", marginTop: 2 }}>economize {formatBRL(Math.round(total * 0.05))} no combo</div>
        </div>
        <Button>Adicionar combo</Button>
      </div>
    </section>
  );
}
function ComboItem({ p }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 88, aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 4, overflow: "hidden" }}>
        <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, lineHeight: 1.2 }}>{p.name}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{formatBRL(p.price)}</div>
      </div>
    </div>
  );
}

function RelatedSlot({ title, go, onWish, wished }) {
  const items = CATALOG.slice(4, 8);
  return (
    <section style={{ marginTop: 120 }}>
      <SlotMark label="recomendações · IA Core"/>
      <SectionHeader eyebrow="Você também pode" title={title}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
        {items.map(p => <ProductCard key={p.id} p={p} onOpen={(id)=>go({ name: "pdp", id })} onWish={onWish} wished={wished.includes(p.id)}/>)}
      </div>
    </section>
  );
}

function UGCSlot() {
  return (
    <section style={{ marginTop: 120, marginBottom: 100 }}>
      <SlotMark label="UGC · Sprint social"/>
      <SectionHeader eyebrow="Mundo real" title="Como nossas clientes usam"/>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32 }}>
        <div style={{ position: "relative", aspectRatio: "4/3", background: "#F4F1E9", borderRadius: 8, overflow: "hidden" }}>
          <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          {[{ x: 32, y: 38 }, { x: 56, y: 60 }].map((tag, i) => (
            <button key={i} style={{
              position: "absolute", left: tag.x + "%", top: tag.y + "%", transform: "translate(-50%,-50%)",
              width: 28, height: 28, borderRadius: 999, background: "rgba(255,255,255,0.95)", border: "1px solid var(--accent)",
              cursor: "pointer", display: "grid", placeItems: "center", color: "var(--accent)", fontSize: 14, fontWeight: 600,
            }}>+</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>2 peças marcadas nesta foto</div>
          {CATALOG.slice(1, 3).map(p => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 14, alignItems: "center", padding: 12, background: "var(--surface)", borderRadius: 8 }}>
              <div style={{ aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 4, overflow: "hidden" }}>
                <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{formatBRL(p.price)}</div>
              </div>
              <button style={{ background: "none", border: "1px solid var(--text-primary)", padding: "8px 14px", borderRadius: 4, fontSize: 12, cursor: "pointer", color: "var(--text-primary)" }}>Ver</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChatbotFAB() {
  return (
    <button style={{
      position: "fixed", bottom: 28, right: 28, width: 56, height: 56, borderRadius: 999,
      background: "var(--text-primary)", color: "#fff", border: "none", cursor: "pointer",
      boxShadow: "0 12px 32px rgba(26,22,18,0.18)", display: "grid", placeItems: "center", zIndex: 40,
    }} aria-label="Atendimento">
      <Icon name="chat" size={22}/>
    </button>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)" }}>{children}</div>;
}
