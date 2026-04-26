// Chrome.jsx — Header (sticky w/ blur) + Footer (dark)
const { useEffect: _useEffectChrome, useState: _useStateChrome } = React;

window.Header = function Header({ cartCount, wishCount, route, go }) {
  const [scrolled, setScrolled] = _useStateChrome(false);
  const [menuOpen, setMenuOpen] = _useStateChrome(false);
  _useEffectChrome(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: scrolled ? "rgba(250,250,246,0.78)" : "var(--bg)",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? "1px solid var(--divider)" : "1px solid transparent",
      transition: "all 200ms",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0 var(--container-pad)",
        height: 80, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 24,
      }}>
        <nav style={{ display: "flex", gap: 28, fontSize: 13 }}>
          {CATEGORIES.map(c => (
            <a key={c.slug} onClick={(e) => { e.preventDefault(); go({ name: "plp", category: c.slug }); }}
               style={{ cursor: "pointer", color: "var(--text-primary)" }}>{c.label}</a>
          ))}
          <a onClick={(e) => { e.preventDefault(); go({ name: "plp", category: null }); }}
             style={{ cursor: "pointer", color: "var(--text-secondary)" }}>Coleções</a>
        </nav>
        <a onClick={() => go({ name: "home" })} style={{ cursor: "pointer" }}>
          <img src="../../assets/logo-placeholder.svg" alt="Atelier" style={{ height: 44 }}/>
        </a>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, alignItems: "center", position: "relative" }}>
          <button style={iconBtn}><Icon name="search"/></button>
          <button style={iconBtn} onClick={() => setMenuOpen(o => !o)}>
            <Icon name="user"/>
          </button>
          {menuOpen && (
            <div onClick={()=>setMenuOpen(false)} style={{ position: "absolute", top: 44, right: 60, background: "var(--bg)", border: "1px solid var(--divider)", borderRadius: 6, padding: 8, minWidth: 180, boxShadow: "0 12px 32px rgba(26,22,18,0.12)", zIndex: 60, display: "flex", flexDirection: "column" }}>
              {[
                { l: "Minha conta", r: "account-home" },
                { l: "Pedidos", r: "account-orders" },
                { l: "Wishlist", r: "wishlist" },
                { l: "Entrar", r: "login" },
                { l: "Criar conta", r: "signup" },
                { l: "—", r: null },
                { l: "Sobre a marca", r: "about" },
                { l: "Trocas e devoluções", r: "returns" },
                { l: "404 (preview)", r: "404" },
                { l: "Emails (preview)", r: "emails" },
                { l: "Estados (preview)", r: "states" },
              ].map((o, i) => o.r === null
                ? <div key={i} style={{ height: 1, background: "var(--divider)", margin: "6px 4px" }}/>
                : <a key={o.l} onClick={()=>go({ name: o.r })} style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", color: "var(--text-primary)", borderRadius: 4 }}>{o.l}</a>)}
            </div>
          )}
          <button style={iconBtn} onClick={() => go({ name: "wishlist" })}>
            <Icon name="heart"/>
            {wishCount > 0 && <Pip>{wishCount}</Pip>}
          </button>
          <button style={iconBtn} onClick={() => go({ name: "cart" })}>
            <Icon name="bag"/>
            {cartCount > 0 && <Pip>{cartCount}</Pip>}
          </button>
        </div>
      </div>
    </header>
  );
};

const iconBtn = { position: "relative", background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-primary)", padding: 6, display: "grid", placeItems: "center" };
function Pip({ children }) {
  return <span style={{ position: "absolute", top: -2, right: -4, background: "var(--accent)",
                       color: "#fff", fontSize: 10, fontWeight: 600, height: 16, minWidth: 16,
                       borderRadius: 999, padding: "0 4px", display: "grid", placeItems: "center" }}>{children}</span>;
}

window.Footer = function Footer({ go }) {
  return (
    <footer style={{ background: "var(--footer-bg)", color: "var(--footer-text)", marginTop: 120 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "var(--sp-20) var(--container-pad) var(--sp-12)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 60, alignItems: "start" }}>
          <div>
            <img src="../../assets/logo-placeholder-light.svg" alt="" style={{ height: 56 }}/>
            <p style={{ color: "var(--footer-muted)", fontSize: 14, marginTop: 20, lineHeight: 1.6, maxWidth: 320 }}>
              Joalheria contemporânea. Cada peça é finalizada à mão no nosso ateliê em São Paulo.
            </p>
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <input placeholder="seu@email.com"
                     style={{ flex: 1, padding: "12px 14px", background: "transparent",
                              border: "1px solid #3A332C", color: "#FAFAF6", fontFamily: "var(--font-body)",
                              fontSize: 14, borderRadius: 2 }}/>
              <button style={{ padding: "12px 18px", background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, cursor: "pointer", borderRadius: 2 }}>Assinar</button>
            </div>
          </div>
          <FooterCol title="Loja" links={[["Anéis","plp:aneis"],["Brincos","plp:brincos"],["Colares","plp:colares"],["Pulseiras","plp:pulseiras"],["Edições limitadas","plp:"]]} go={go}/>
          <FooterCol title="Atendimento" links={[["Trocas e devoluções","returns"],["Garantia","returns"],["Frete e prazo","returns"],["Personalização","about"],["Contato","about"]]} go={go}/>
          <FooterCol title="Sobre" links={[["Nossa história","about"],["Política de privacidade","privacy"],["Termos de uso","terms"],["Imprensa","about"]]} go={go}/>
        </div>
        <div style={{ borderTop: "1px solid #3A332C", marginTop: 60, paddingTop: 24,
                     display: "flex", justifyContent: "space-between", color: "var(--footer-muted)", fontSize: 12 }}>
          <span>© 2026 Atelier · CNPJ 00.000.000/0001-00</span>
          <span>Política de privacidade · Termos · Trocas</span>
        </div>
      </div>
    </footer>
  );
};

function FooterCol({ title, links, go }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18, color: "var(--footer-text)" }}>{title}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map(([l, r]) => {
          const onClick = () => {
            if (!r) return;
            if (r.startsWith("plp:")) go({ name: "plp", category: r.slice(4) || null });
            else go({ name: r });
          };
          return <li key={l}><a onClick={onClick} style={{ color: "var(--footer-muted)", fontSize: 14, cursor: "pointer" }}>{l}</a></li>;
        })}
      </ul>
    </div>
  );
}
