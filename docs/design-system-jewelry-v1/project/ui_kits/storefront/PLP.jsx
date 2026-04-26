// PLP.jsx — product list with filters sidebar
const { useState: _useStatePLP, useMemo: _useMemoPLP } = React;

window.PLP = function PLP({ category, go, onWish, wished }) {
  const [filters, setFilters] = _useStatePLP({ material: [], stone: [], priceMax: 5000, size: null });
  const [sort, setSort] = _useStatePLP("relevance");

  const filtered = _useMemoPLP(() => {
    let out = CATALOG.filter(p => !category || p.cat === category);
    if (filters.material.length) out = out.filter(p => filters.material.includes(p.material));
    if (filters.stone.length)    out = out.filter(p => p.stone && filters.stone.includes(p.stone));
    out = out.filter(p => p.price <= filters.priceMax);
    if (sort === "price-asc")  out = [...out].sort((a,b) => a.price - b.price);
    if (sort === "price-desc") out = [...out].sort((a,b) => b.price - a.price);
    return out;
  }, [filters, sort, category]);

  const cat = CATEGORIES.find(c => c.slug === category);
  const title = cat ? cat.label : "Todas as peças";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px var(--container-pad) 0" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>Coleção</div>
        <h1 style={{ margin: 0, fontSize: 56 }}>{title}</h1>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 12 }}>{filtered.length} peças</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 56 }}>
        <aside>
          <FilterGroup title="Material">
            {MATERIALS.map(m => (
              <label key={m.slug} style={chk}>
                <input type="checkbox" checked={filters.material.includes(m.slug)}
                  onChange={() => setFilters(f => ({ ...f, material: toggle(f.material, m.slug) }))}/>
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 999, background: m.swatch, border: "1px solid #00000020" }}/>
                {m.label}
              </label>
            ))}
          </FilterGroup>

          <FilterGroup title="Pedra">
            {STONES.map(s => (
              <label key={s.slug} style={chk}>
                <input type="checkbox" checked={filters.stone.includes(s.slug)}
                  onChange={() => setFilters(f => ({ ...f, stone: toggle(f.stone, s.slug) }))}/>
                {s.label}
              </label>
            ))}
          </FilterGroup>

          <FilterGroup title="Preço até">
            <input type="range" min="200" max="5000" step="100" value={filters.priceMax}
                   onChange={(e)=> setFilters(f => ({ ...f, priceMax: +e.target.value }))}
                   style={{ width: "100%", accentColor: "var(--accent)" }}/>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>{formatBRL(filters.priceMax)}</div>
          </FilterGroup>

          <FilterGroup title="Aro">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[12,13,14,15,16,17,18,19,20].map(s => (
                <button key={s} onClick={() => setFilters(f => ({ ...f, size: f.size === s ? null : s }))}
                        style={{
                          padding: "8px 12px", fontSize: 13, cursor: "pointer", borderRadius: 2,
                          background: filters.size === s ? "var(--text-primary)" : "var(--surface)",
                          color: filters.size === s ? "#fff" : "var(--text-primary)",
                          border: "1px solid " + (filters.size === s ? "var(--text-primary)" : "var(--divider)"),
                        }}>{s}</button>
              ))}
            </div>
          </FilterGroup>
        </aside>

        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
            <select value={sort} onChange={(e)=>setSort(e.target.value)}
                    style={{ padding: "10px 14px", fontFamily: "var(--font-body)", fontSize: 14, border: "1px solid var(--divider)", borderRadius: 2, background: "var(--surface)" }}>
              <option value="relevance">Mais relevantes</option>
              <option value="price-asc">Preço: menor primeiro</option>
              <option value="price-desc">Preço: maior primeiro</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {filtered.map(p => <ProductCard key={p.id} p={p} onOpen={(id)=>go({ name: "pdp", id })} onWish={onWish} wished={wished.includes(p.id)}/>)}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 80, textAlign: "center", color: "var(--text-secondary)" }}>
              Nenhuma peça com esses filtros. Tente abrir o preço.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 60 }}>
            {[1,2,3,4].map(n => (
              <button key={n} style={{
                width: 36, height: 36, borderRadius: 2, fontSize: 13, cursor: "pointer",
                background: n === 1 ? "var(--text-primary)" : "var(--surface)",
                color: n === 1 ? "#fff" : "var(--text-primary)",
                border: "1px solid " + (n === 1 ? "var(--text-primary)" : "var(--divider)"),
              }}>{n}</button>
            ))}
            <button style={{ width: 36, height: 36, borderRadius: 2, background: "var(--surface)", border: "1px solid var(--divider)", cursor: "pointer", color: "var(--text-primary)" }}>
              <Icon name="chevron" size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function FilterGroup({ title, children }) {
  return (
    <div style={{ paddingBottom: 24, marginBottom: 24, borderBottom: "1px solid var(--divider)" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}
const chk = { display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text-primary)", cursor: "pointer" };
function toggle(arr, v) { return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; }
