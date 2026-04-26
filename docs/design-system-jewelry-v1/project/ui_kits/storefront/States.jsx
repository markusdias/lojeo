// States.jsx — global states (loading skeleton, error, empty, success toast)
window.SkeletonGrid = function SkeletonGrid({ count = 8 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ aspectRatio: "3/4", background: "var(--surface)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
            <div className="skeleton-shimmer"/>
          </div>
          <div style={{ height: 14, background: "var(--surface)", borderRadius: 2, width: "70%", marginTop: 6 }}/>
          <div style={{ height: 12, background: "var(--surface)", borderRadius: 2, width: "40%" }}/>
        </div>
      ))}
    </div>
  );
};

window.ErrorState = function ErrorState({ title = "Algo não saiu como esperado.", desc = "Tente novamente em instantes — já avisamos a equipe.", onRetry }) {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 999, background: "#F4E6E6", color: "#A84444", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
        <Icon name="alert" size={26}/>
      </div>
      <h2 style={{ fontSize: 28, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginTop: 10, maxWidth: 420, marginInline: "auto", lineHeight: 1.6 }}>{desc}</p>
      {onRetry && <div style={{ marginTop: 24 }}><Button onClick={onRetry}>Tentar novamente</Button></div>}
    </div>
  );
};

window.EmptyState = function EmptyState({ icon = "search", title, desc, cta, onCta }) {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--surface)", color: "var(--text-muted)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
        <Icon name={icon} size={28}/>
      </div>
      <h2 style={{ fontSize: 28, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginTop: 10, maxWidth: 420, marginInline: "auto", lineHeight: 1.6 }}>{desc}</p>
      {cta && <div style={{ marginTop: 24 }}><Button onClick={onCta}>{cta}</Button></div>}
    </div>
  );
};

window.Toast = function Toast({ message, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "var(--text-primary)", color: "#FAF7F0", padding: "12px 20px",
      borderRadius: 4, fontSize: 14, zIndex: 200, display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 12px 32px rgba(26,22,18,0.25)",
    }}>
      <span style={{ width: 16, height: 16, borderRadius: 999, background: "var(--success)", display: "grid", placeItems: "center", color: "#fff", fontSize: 11 }}>✓</span>
      {message}
    </div>
  );
};

window.FormError = function FormError({ message }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#A84444", fontSize: 12, marginTop: 6 }}>
      <span style={{ width: 14, height: 14, borderRadius: 999, background: "#A84444", color: "#fff", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700 }}>!</span>
      {message}
    </div>
  );
};

window.StatesGallery = function StatesGallery({ go }) {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px var(--container-pad) 80px" }}>
      <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12 }}>Sistema</div>
      <h1 style={{ fontSize: 48, margin: 0 }}>Estados globais</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 8, marginBottom: 40 }}>Loading · Erro · Vazio · Sucesso · Erro de formulário</p>

      <Block title="Loading · skeleton">
        <SkeletonGrid count={4}/>
      </Block>

      <Block title="Erro · genérico">
        <div style={{ background: "var(--surface)", borderRadius: 8 }}>
          <ErrorState title="Não conseguimos carregar a coleção." desc="Pode ser instabilidade temporária. Tente novamente em alguns segundos." onRetry={()=>{}}/>
        </div>
      </Block>

      <Block title="Vazio · busca sem resultado">
        <div style={{ background: "var(--surface)", borderRadius: 8 }}>
          <EmptyState icon="search" title="Nada encontrado para “esmeralda”" desc="Ajustar filtros ou ver coleção completa pode ajudar." cta="Ver coleção" onCta={()=>go({ name:"plp", category: null })}/>
        </div>
      </Block>

      <Block title="Vazio · sacola">
        <div style={{ background: "var(--surface)", borderRadius: 8 }}>
          <EmptyState icon="bag" title="Sua sacola está vazia" desc="Comece pelas peças mais queridas — voltam ao estoque toda semana." cta="Ver mais vendidas" onCta={()=>go({ name:"plp", category: null })}/>
        </div>
      </Block>

      <Block title="Sucesso · toast">
        <div style={{ background: "var(--surface)", borderRadius: 8, padding: 60, position: "relative", minHeight: 120 }}>
          <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--text-primary)", color: "#FAF7F0", padding: "12px 20px", borderRadius: 4, fontSize: 14, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 12px 32px rgba(26,22,18,0.25)" }}>
            <span style={{ width: 16, height: 16, borderRadius: 999, background: "var(--success)", display: "grid", placeItems: "center", color: "#fff", fontSize: 11 }}>✓</span>
            Aliança Solitário adicionada à sacola
          </div>
        </div>
      </Block>

      <Block title="Erro · validação de formulário">
        <div style={{ background: "var(--surface)", padding: 28, borderRadius: 8, maxWidth: 460 }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>Email</div>
          <input defaultValue="maria@email" style={{ width: "100%", padding: "12px 14px", background: "var(--bg)", border: "1px solid #A84444", borderRadius: 2, fontSize: 14, fontFamily: "var(--font-body)", outline: "none" }}/>
          <FormError message="Email inválido — verifique o domínio."/>
        </div>
      </Block>

      <Block title="Erro · sem estoque (PDP)">
        <div style={{ background: "var(--surface)", padding: 28, borderRadius: 8, maxWidth: 460 }}>
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>Aro</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[12,13,14].map(n => <span key={n} style={{ padding: "10px 14px", fontSize: 13, background: "var(--bg)", border: "1px solid var(--divider)", borderRadius: 2, textDecoration: "line-through", color: "var(--text-muted)" }}>{n}</span>)}
          </div>
          <FormError message="Tamanho indisponível — toque ♥ e te avisamos quando voltar."/>
        </div>
      </Block>

      <Block title="Erro · falha de pagamento">
        <div style={{ background: "#F4E6E6", padding: 20, borderRadius: 6, color: "#A84444", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ width: 20, height: 20, borderRadius: 999, background: "#A84444", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>!</span>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Pagamento recusado pelo banco emissor</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tente outro cartão ou Pix. Nenhum valor foi cobrado.</div>
          </div>
        </div>
      </Block>
    </div>
  );
};

function Block({ title, children }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
