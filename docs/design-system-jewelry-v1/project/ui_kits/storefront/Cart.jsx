// Cart.jsx
const { useState: _useStateCart } = React;

window.Cart = function Cart({ items, onRemove, onQty, go, onWish, wished }) {
  const [cep, setCep] = _useStateCart("");
  const [coupon, setCoupon] = _useStateCart("");
  const [shipping, setShipping] = _useStateCart(null);

  const subtotal = items.reduce((s, it) => {
    const p = CATALOG.find(x => x.id === it.id);
    return s + (p?.price || 0) * it.qty;
  }, 0);
  const total = subtotal + (shipping?.cost || 0);

  function calcShipping() {
    if (cep.replace(/\D/g, "").length === 8) {
      setShipping({ cost: subtotal >= 500 ? 0 : 28, days: "3 a 5 dias úteis" });
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 1280, margin: "40px auto 0", padding: "0 var(--container-pad)" }}>
        <h1 style={{ fontSize: 44, margin: 0 }}>Sua sacola</h1>
        <div style={{ background: "var(--surface)", borderRadius: 8, marginTop: 32 }}>
          <EmptyState icon="bag" title="Sua sacola está vazia" desc="Comece pelas peças mais queridas — voltam ao estoque toda semana." cta="Ver coleção" onCta={() => go({ name: "plp", category: null })}/>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px var(--container-pad) 0" }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>Sua sacola</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 8, marginBottom: 40 }}>{items.length} peça(s)</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 56, alignItems: "start" }}>
        <div>
          {items.map(it => {
            const p = CATALOG.find(x => x.id === it.id);
            if (!p) return null;
            return (
              <div key={it.id + it.size + it.material} style={{
                display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 20,
                padding: "24px 0", borderBottom: "1px solid var(--divider)",
              }}>
                <div style={{ aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 6, overflow: "hidden" }}>
                  <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>{p.name}</h3>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
                    {it.material.replace("-", " ")} · aro {it.size}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
                    <div style={{ display: "flex", border: "1px solid var(--divider)", borderRadius: 4 }}>
                      <button onClick={() => onQty(it, -1)} style={qtyBtn}><Icon name="minus" size={14}/></button>
                      <div style={{ minWidth: 36, display: "grid", placeItems: "center", fontSize: 14 }}>{it.qty}</div>
                      <button onClick={() => onQty(it, +1)} style={qtyBtn}><Icon name="plus" size={14}/></button>
                    </div>
                    <button onClick={() => onRemove(it)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <Icon name="trash" size={14}/> Remover
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontFamily: "var(--font-display)" }}>{formatBRL(p.price * it.qty)}</div>
              </div>
            );
          })}
        </div>

        <aside style={{ background: "var(--surface)", padding: 28, borderRadius: 8, position: "sticky", top: 100 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0, marginBottom: 20 }}>Resumo</h3>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>CEP</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={cep} onChange={(e)=>setCep(e.target.value)} placeholder="00000-000"
                     style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--divider)", borderRadius: 2, fontSize: 14, background: "var(--bg)" }}/>
              <button onClick={calcShipping} style={{ padding: "10px 14px", background: "var(--text-primary)", color: "#fff", border: "none", borderRadius: 2, fontSize: 13, cursor: "pointer" }}>Calcular</button>
            </div>
            {shipping && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6 }}>{shipping.cost === 0 ? "Frete grátis" : formatBRL(shipping.cost)} · {shipping.days}</div>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>Cupom</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={coupon} onChange={(e)=>setCoupon(e.target.value)} placeholder="ex: PRIMEIRACOMPRA"
                     style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--divider)", borderRadius: 2, fontSize: 14, background: "var(--bg)" }}/>
              <button style={{ padding: "10px 14px", background: "transparent", color: "var(--text-primary)", border: "1px solid var(--text-primary)", borderRadius: 2, fontSize: 13, cursor: "pointer" }}>Aplicar</button>
            </div>
          </div>

          <Line label="Subtotal" value={formatBRL(subtotal)}/>
          <Line label="Frete"     value={shipping ? (shipping.cost === 0 ? "grátis" : formatBRL(shipping.cost)) : "calcular"}/>
          <div style={{ borderTop: "1px solid var(--divider)", margin: "16px 0", paddingTop: 16 }}>
            <Line label="Total" value={formatBRL(total)} bold/>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>ou 6× {formatBRL(total/6)} sem juros</div>
          </div>

          <Button full onClick={() => go({ name: "checkout" })}>Finalizar compra</Button>
          <a onClick={() => go({ name: "plp", category: null })}
             style={{ display: "block", textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", borderBottom: "1px solid currentColor", paddingBottom: 4, width: "fit-content", marginInline: "auto" }}>
            continuar comprando
          </a>
        </aside>
      </div>

      <section style={{ marginTop: 120 }}>
        <SectionHeader eyebrow="Slot · Sprint 11" title="Você também pode gostar"/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {CATALOG.slice(8, 12).map(p =>
            <ProductCard key={p.id} p={p} onOpen={(id)=>go({ name: "pdp", id })} onWish={onWish} wished={wished.includes(p.id)}/>
          )}
        </div>
      </section>
    </div>
  );
};

const qtyBtn = { width: 32, height: 32, background: "transparent", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--text-primary)" };
function Line({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: bold ? 18 : 14, fontFamily: bold ? "var(--font-display)" : "var(--font-body)", color: "var(--text-primary)" }}>
      <span style={{ color: bold ? "var(--text-primary)" : "var(--text-secondary)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
