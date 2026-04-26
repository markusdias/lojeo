// Auth.jsx — login, signup, recover password
const { useState: _useStateAuth } = React;

window.AuthScreen = function AuthScreen({ mode, go }) {
  // mode: "login" | "signup" | "recover"
  return (
    <div style={{ minHeight: "calc(100vh - 80px)", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      <div style={{ display: "grid", placeItems: "center", padding: "60px 40px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {mode === "login" && <LoginForm go={go}/>}
          {mode === "signup" && <SignupForm go={go}/>}
          {mode === "recover" && <RecoverForm go={go}/>}
        </div>
      </div>
      <div style={{ background: "var(--surface-warm)", display: "grid", placeItems: "center", padding: 40, position: "relative", overflow: "hidden" }}>
        <div style={{ width: "min(420px, 80%)", aspectRatio: "3/4", background: "#E8DDC9", borderRadius: 4, overflow: "hidden", position: "relative" }}>
          <img src="../../assets/product-placeholder.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        </div>
        <div style={{ position: "absolute", bottom: 40, left: 40, right: 40, color: "var(--text-secondary)", fontSize: 13 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-primary)", marginBottom: 6 }}>Sua conta, suas peças.</div>
          Acompanhe pedidos, gerencie garantias e descubra peças sob medida.
        </div>
      </div>
    </div>
  );
};

function LoginForm({ go }) {
  return (
    <>
      <h1 style={{ fontSize: 36, margin: 0 }}>Entrar</h1>
      <p style={{ color: "var(--text-secondary)", margin: "8px 0 28px" }}>É bom te ver.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SocialBtnAuth icon="g">Continuar com Google</SocialBtnAuth>
        <SocialBtnAuth icon="a">Continuar com Apple</SocialBtnAuth>
      </div>
      <DividerAuth/>

      <FieldAuth label="Email"><input type="email" style={inpAuth} placeholder="seu@email.com"/></FieldAuth>
      <FieldAuth label="Senha"><input type="password" style={inpAuth} placeholder="••••••••"/></FieldAuth>
      <a onClick={()=>go({ name:"recover" })} style={{ fontSize: 12, color: "var(--text-secondary)", borderBottom: "1px solid currentColor", cursor: "pointer", display: "inline-block", marginTop: 4 }}>Esqueci minha senha</a>

      <div style={{ marginTop: 24 }}><Button onClick={()=>go({ name:"account-home" })} full>Entrar</Button></div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 18, textAlign: "center" }}>
        Novo por aqui? <a onClick={()=>go({ name:"signup" })} style={{ color: "var(--text-primary)", borderBottom: "1px solid currentColor", cursor: "pointer" }}>Criar conta</a>
      </div>
    </>
  );
}

function SignupForm({ go }) {
  const [tos, setTos] = _useStateAuth(false);
  return (
    <>
      <h1 style={{ fontSize: 36, margin: 0 }}>Criar conta</h1>
      <p style={{ color: "var(--text-secondary)", margin: "8px 0 28px" }}>Leva menos de 1 minuto.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SocialBtnAuth icon="g">Continuar com Google</SocialBtnAuth>
        <SocialBtnAuth icon="a">Continuar com Apple</SocialBtnAuth>
      </div>
      <DividerAuth/>

      <FieldAuth label="Nome"><input style={inpAuth}/></FieldAuth>
      <FieldAuth label="Email"><input type="email" style={inpAuth}/></FieldAuth>
      <FieldAuth label="Senha"><input type="password" style={inpAuth} placeholder="mínimo 8 caracteres"/></FieldAuth>

      <label style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-secondary)", marginTop: 16, cursor: "pointer", lineHeight: 1.5 }}>
        <input type="checkbox" checked={tos} onChange={e=>setTos(e.target.checked)} style={{ marginTop: 3 }}/>
        Aceito os <a style={{ color: "var(--text-primary)", borderBottom: "1px solid currentColor" }}>termos</a> e <a style={{ color: "var(--text-primary)", borderBottom: "1px solid currentColor" }}>política de privacidade</a> (LGPD).
      </label>
      <label style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-secondary)", marginTop: 10, cursor: "pointer" }}>
        <input type="checkbox"/> Quero receber novidades por email (opcional)
      </label>

      <div style={{ marginTop: 24 }}><Button onClick={()=>go({ name:"account-home" })} full disabled={!tos}>Criar conta</Button></div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 18, textAlign: "center" }}>
        Já tem conta? <a onClick={()=>go({ name:"login" })} style={{ color: "var(--text-primary)", borderBottom: "1px solid currentColor", cursor: "pointer" }}>Entrar</a>
      </div>
    </>
  );
}

function RecoverForm({ go }) {
  const [step, setStep] = _useStateAuth(1);
  return (
    <>
      <a onClick={()=>go({ name:"login" })} style={{ fontSize: 12, color: "var(--text-secondary)", display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer", marginBottom: 24 }}>
        <Icon name="chevron-left" size={12}/> Voltar
      </a>
      <h1 style={{ fontSize: 32, margin: 0 }}>Recuperar senha</h1>
      {step === 1 ? (
        <>
          <p style={{ color: "var(--text-secondary)", margin: "8px 0 28px" }}>Enviaremos um link para seu email.</p>
          <FieldAuth label="Email"><input type="email" style={inpAuth} placeholder="seu@email.com"/></FieldAuth>
          <div style={{ marginTop: 24 }}><Button onClick={()=>setStep(2)} full>Enviar link</Button></div>
        </>
      ) : (
        <>
          <p style={{ color: "var(--text-secondary)", margin: "8px 0 28px" }}>Defina uma nova senha.</p>
          <FieldAuth label="Nova senha"><input type="password" style={inpAuth} placeholder="mínimo 8 caracteres"/></FieldAuth>
          <FieldAuth label="Confirmar"><input type="password" style={inpAuth}/></FieldAuth>
          <div style={{ marginTop: 24 }}><Button onClick={()=>go({ name:"login" })} full>Salvar e entrar</Button></div>
        </>
      )}
    </>
  );
}

const inpAuth = { width: "100%", padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--divider)", borderRadius: 2, fontSize: 14, fontFamily: "var(--font-body)", outline: "none" };
function FieldAuth({ label, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
function SocialBtnAuth({ icon, children }) {
  return (
    <button style={{ width: "100%", padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--divider)", borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <span style={{ width: 18, height: 18, display: "grid", placeItems: "center" }}>
        {icon === "g" ? <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z" fill="#4285f4"/><path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A8.99 8.99 0 0 0 9 18z" fill="#34a853"/><path d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" fill="#fbbc05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#ea4335"/></svg>
         : <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.94-3.08.45-1.09-.5-2.08-.46-3.21 0-1.42.55-2.18.39-3.04-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
      </span>
      {children}
    </button>
  );
}
function DividerAuth() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--text-muted)", fontSize: 12, margin: "20px 0 4px" }}>
      <div style={{ flex: 1, height: 1, background: "var(--divider)" }}/>ou<div style={{ flex: 1, height: 1, background: "var(--divider)" }}/>
    </div>
  );
}
