// Primitives.jsx — shared UI atoms
const { useState } = React;

// Lucide-style inline icons (1.5 stroke, currentColor)
window.Icon = function Icon({ name, size = 20, ...rest }) {
  const paths = {
    search:    <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></>,
    bag:       <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
    user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    heart:     <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    "heart-filled": <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/>,
    close:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    chevron:   <polyline points="9 18 15 12 9 6"/>,
    "chevron-down": <polyline points="6 9 12 15 18 9"/>,
    "chevron-left":  <polyline points="15 18 9 12 15 6"/>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus:     <line x1="5" y1="12" x2="19" y2="12"/>,
    check:     <polyline points="20 6 9 17 4 12"/>,
    truck:     <><path d="M3 7h13l5 5v5h-3"/><path d="M14 17H8"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></>,
    shield:    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    star:      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    "star-filled": <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>,
    gift:      <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/></>,
    trash:     <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></>,
    menu:      <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    chat:      <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    sparkle:   <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    arrow:     <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    info:      <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    alert:     <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    play:      <polygon points="6 4 20 12 6 20 6 4"/>,
    zoom:      <><circle cx="11" cy="11" r="7"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><path d="M21 21l-4.35-4.35"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name] || null}
    </svg>
  );
};

window.Button = function Button({ variant = "primary", children, full, onClick, disabled, ...rest }) {
  const base = {
    fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
    padding: "14px 28px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.02em", transition: "all 240ms cubic-bezier(.22,1,.36,1)",
    width: full ? "100%" : "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    opacity: disabled ? 0.4 : 1,
  };
  const variants = {
    primary: { background: "var(--text-primary)", color: "var(--text-on-dark)" },
    accent:  { background: "var(--accent)", color: "#fff" },
    ghost:   { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--text-primary)" },
    link:    { background: "none", color: "var(--text-primary)", padding: "10px 0", borderBottom: "1px solid var(--text-primary)", borderRadius: 0 },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }} {...rest}>{children}</button>;
};

window.Badge = function Badge({ tone = "neutral", children }) {
  const tones = {
    neutral: { background: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--divider)" },
    accent:  { background: "var(--accent-soft)", color: "var(--accent)" },
    warn:    { background: "#F6EEDC", color: "#B8853A" },
    out:     { background: "#F4F4F2", color: "var(--text-muted)" },
    dark:    { background: "var(--text-primary)", color: "#fff" },
  };
  return <span style={{
    fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
    padding: "5px 10px", borderRadius: 999, fontWeight: 500, ...tones[tone],
  }}>{children}</span>;
};

window.Stars = function Stars({ value = 5, size = 14 }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, color: "var(--accent)" }}>
      {[1,2,3,4,5].map(i => <Icon key={i} name={i <= value ? "star-filled" : "star"} size={size}/>)}
    </span>
  );
};

window.ProductCard = function ProductCard({ p, onOpen, onWish, wished }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={() => onOpen(p.id)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
         style={{ cursor: "pointer", background: "var(--surface)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
      <div style={{ aspectRatio: "1/1", background: "#F4F1E9", overflow: "hidden", position: "relative" }}>
        <img src="../../assets/product-placeholder.svg" alt=""
             style={{ width: "100%", height: "100%", objectFit: "cover",
                      transform: hover ? "scale(1.04)" : "scale(1)",
                      transition: "transform 600ms cubic-bezier(.22,1,.36,1)" }}/>
        {p.badge && <div style={{ position: "absolute", top: 12, left: 12 }}>
          <Badge tone={p.best ? "accent" : "neutral"}>{p.badge}</Badge>
        </div>}
        <button onClick={(e) => { e.stopPropagation(); onWish(p.id); }}
                style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 999,
                         background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer",
                         display: "grid", placeItems: "center", color: wished ? "var(--accent)" : "var(--text-secondary)" }}>
          <Icon name={wished ? "heart-filled" : "heart"} size={16}/>
        </button>
      </div>
      <div style={{ padding: "14px 4px 18px" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0, fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</h3>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 8px" }}>
          {p.material.replace("-", " ")}{p.stone ? ` · ${p.stone}` : ""}
        </div>
        <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{formatBRL(p.price)}</div>
      </div>
    </div>
  );
};

window.SectionHeader = function SectionHeader({ eyebrow, title, link, onLink }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, gap: 24 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 8 }}>{eyebrow}</div>}
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      {link && <button onClick={onLink} style={{ background: "none", border: "none", borderBottom: "1px solid var(--text-primary)",
                              padding: "6px 0", cursor: "pointer", fontSize: 13, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
        {link} →
      </button>}
    </div>
  );
};
