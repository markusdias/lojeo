// Home.jsx — homepage with hero, collections, new arrivals, about, UGC, trust
window.Home = function Home({ go, onWish, wished }) {
  return (
    <>
      <Hero go={go}/>
      <Collections go={go}/>
      <NewArrivals go={go} onWish={onWish} wished={wished}/>
      <AboutBrief/>
      <UGC/>
      <TrustRow/>
    </>
  );
};

function Hero({ go }) {
  return (
    <section style={{ position: "relative", maxWidth: 1280, margin: "24px auto 0", padding: "0 var(--container-pad)" }}>
      <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "16/9", background: "linear-gradient(135deg, #E8DDC9 0%, #D4C5A8 100%)" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
          <img src="../../assets/hero-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "right center" }}/>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(232,221,201,0.92) 0%, rgba(232,221,201,0.4) 50%, rgba(232,221,201,0) 70%)" }}/>
        <div style={{ position: "absolute", left: 60, top: "50%", transform: "translateY(-50%)", maxWidth: 720, color: "var(--text-primary)" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 16, color: "var(--text-secondary)" }}>Coleção · Outono ’26</div>
          <h1 style={{ fontSize: "clamp(40px, 5.4vw, 68px)", margin: 0, lineHeight: 1.05, textWrap: "balance", minHeight: "1.1em" }}>Peças que ficam.</h1>
          <p style={{ fontSize: 17, color: "var(--text-secondary)", marginTop: 20, marginBottom: 28, lineHeight: 1.5, maxWidth: 360 }}>
            Joalheria contemporânea, finalizada à mão no nosso ateliê. Ouro 18k e prata 925 com garantia de um ano.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Button onClick={() => go({ name: "plp", category: null })}>Ver coleção</Button>
            <Button variant="ghost" onClick={() => go({ name: "about" })}>Nossa história</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Collections({ go }) {
  const collections = [
    { slug: "aneis",   label: "Anéis",     blurb: "Solitários, eternidades e bandas." },
    { slug: "brincos", label: "Brincos",   blurb: "Argolas, ear cuffs, gotas." },
    { slug: "colares", label: "Colares",   blurb: "Pingentes e correntes finas." },
  ];
  return (
    <section style={{ maxWidth: 1280, margin: "120px auto 0", padding: "0 var(--container-pad)" }}>
      <SectionHeader eyebrow="Coleções" title="Por categoria"/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {collections.map(c => (
          <a key={c.slug} onClick={() => go({ name: "plp", category: c.slug })}
             style={{ cursor: "pointer", display: "block" }}>
            <div style={{ aspectRatio: "3/4", background: "#F4F1E9", borderRadius: 8, overflow: "hidden", marginBottom: 18 }}>
              <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            </div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: 24 }}>{c.label}</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>{c.blurb}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function NewArrivals({ go, onWish, wished }) {
  const items = CATALOG.slice(0, 4);
  return (
    <section style={{ maxWidth: 1280, margin: "120px auto 0", padding: "0 var(--container-pad)" }}>
      <SectionHeader eyebrow="Acabou de chegar" title="Recém-criadas"
                     link="ver todas" onLink={() => go({ name: "plp", category: null })}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
        {items.map(p => <ProductCard key={p.id} p={p} onOpen={(id)=>go({ name: "pdp", id })} onWish={onWish} wished={wished.includes(p.id)}/>)}
      </div>
    </section>
  );
}

function AboutBrief() {
  return (
    <section style={{ maxWidth: 1280, margin: "120px auto 0", padding: "0 var(--container-pad)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        <div style={{ aspectRatio: "4/5", background: "#F4F1E9", borderRadius: 8, overflow: "hidden" }}>
          <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 16 }}>Nossa história</div>
          <h2 style={{ fontSize: 44, margin: "0 0 24px", lineHeight: 1.1 }}>Cada peça começa<br/>numa pequena bancada.</h2>
          <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 32 }}>
            Trabalhamos com ourives independentes em São Paulo. Ouro 18k certificado, diamantes rastreáveis, e a sua história gravada à mão se você quiser.
          </p>
          <Button variant="link">Conheça o ateliê →</Button>
        </div>
      </div>
    </section>
  );
}

function UGC() {
  return (
    <section style={{ maxWidth: 1280, margin: "120px auto 0", padding: "0 var(--container-pad)" }}>
      <SectionHeader eyebrow="@atelier" title="Da nossa comunidade"/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ aspectRatio: "1/1", background: "#F4F1E9", borderRadius: 4, overflow: "hidden" }}>
            <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustRow() {
  const items = [
    { icon: "shield", title: "Garantia 1 ano",    desc: "contra defeitos de fabricação" },
    { icon: "truck",  title: "Frete grátis",      desc: "acima de R$ 500" },
    { icon: "gift",   title: "Embalagem presente",desc: "inclusa em todo pedido" },
    { icon: "arrow",  title: "Trocas em 30 dias", desc: "sem perguntas" },
  ];
  return (
    <section style={{ maxWidth: 1280, margin: "120px auto 0", padding: "0 var(--container-pad)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, padding: "60px 0", borderTop: "1px solid var(--divider)", borderBottom: "1px solid var(--divider)" }}>
        {items.map(it => (
          <div key={it.title} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
            <div style={{ color: "var(--accent)" }}><Icon name={it.icon} size={28}/></div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{it.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{it.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
