# UI Audit Log — Lojeo

Append-only. Toda iteração do auditor autônomo registra aqui.

Formato:
```
## YYYY-MM-DD HH:MM — Ciclo N (admin|storefront)
- [P0|P1|P2|P3][app] /rota — descrição → fix em commit <hash> → verificado em prod ✓|✗|pendente
```

Categorias: BUG, LINK_QUEBRADO, GAP, REGRESSAO_VISUAL, INCONSISTENCIA, UX_MOLEZA, CAMADA_TROCADA, I18N_A11Y.

---

## 2026-04-28 — Ciclo 1 — Inicialização

Auditor iniciou loop autônomo. Plano:
1. Mapear rotas reais (admin + storefront) via filesystem
2. Login admin em produção (Google OAuth ou dev-login)
3. Percorrer cada rota com Playwright MCP — snapshot + console + network
4. Categorizar achados por severidade
5. Fixar P0/P1 antes de prosseguir; P2/P3 acumulam até backlog priorizado

URLs alvo:
- Admin: https://apps-lojeo-admin.m9axtw.easypanel.host
- Storefront: https://apps-lojeo-storefront.m9axtw.easypanel.host

### 11:54–12:03 — Achados admin

- [P0][admin] /login renderizava sidebar+topbar+perfil (Admin Lojeo / Atelier Verde · MEI) → fix em commit cf6b645 (RootLayout retorna `{children}` quando session ausente) → verificado em prod ✓ (curl sem cookies não retorna sidebar)
- [P0][admin] /api/notifications → 401 disparado em /login pelo Topbar montado fora de contexto autenticado → mesmo commit cf6b645 (Topbar só renderiza com session) → verificado em prod ✓
- [P1][admin] /api/notifications → 401 mesmo autenticado em /dashboard (session.user.id ausente; callback session não tinha fallback para token.sub) → fix em commit fd2b9a0 → verificado em prod ✓ (session retorna user.id, notifications 200)
- [P0][admin] /pedidos/[id] retornava 500 quando id ≠ UUID (Postgres parser) → fix em commit 608b9f5 (regex UUID + fallback orderNumber, queries internas usam order.id) → CI verde, deploy admin pendente
- [P0][storefront] /checkout sem subpath → 404 → fix em commit 941fda2 (page.tsx redirect server-side → /checkout/endereco) → CI verde 25051807806, **deploy storefront EasyPanel não disparou em 9+ min de polling**; verificar webhook ou trigger manual
- [I] Audit admin: 25 rotas top-level percorridas (/, dashboard, insights, pedidos, devolucoes, cupons, atribuicao, products, collections, inventory, recomendacoes, filas, tickets, chatbot, avaliacoes, garantias, ugc, clientes, wishlist, afiliados, ia-analyst, ia-uso, competitors, conteudo, experiments, aparencia, relatorios, settings + sub-rotas users/audit/2fa/onboarding, notificacoes). Detail amostradas: /pedidos/[uuid] ✓, /products/[uuid] ✓
- [I] Audit storefront: 21 rotas percorridas (/, produtos, produtos/[slug], carrinho, entrar, conta, wishlist, sobre, colecoes, blog, trocas, privacidade, termos, rastreio, gift-cards, comunidade, busca, status, nps, politica, /r/[code]). Sem console errors em rotas públicas (exceto /checkout 404 já fixado).

### 12:50–13:34 — Ciclo 2 — fixes P2/P3 (deploy bloqueado)

- [P2][storefront] 404 page com typos sem acentos → fix em commit 742bb92 (Página/não/você/específico) → deploy storefront travado
- [P2][admin] /aparencia 1 link href="#" + button sem onClick (Ver changelog) → fix em commit e545c37 (removidos) → CI verde → **deploy admin travado** (UI prod ainda tem changelog após 30+ min)
- [P2][storefront] HeartButton type=submit implícito → fix em commit f0bf354 (type="button" explícito) → deploy travado
- [P3][storefront] titles genéricos /entrar /carrinho /gift-cards /nps /rastreio → fix em commit 80ad477 (4 layout.tsx + metadata em rastreio) → deploy travado
- [P3][storefront] /busca sem ?q duplicava h1 /produtos → fix em commit b9c1709 (h1 "O que procura?" + dica) → deploy travado
- [BLOCKER] EasyPanel deploys storefront E admin presos há >1h sem responder a push. Sem webhook GitHub configurado; CLAUDE.md aponta `services.app.deployService` via MCP EasyPanel (token master) que não está disponível nesta sessão. Stakeholder precisa: (a) disparar deploy manualmente, (b) habilitar MCP EasyPanel ao agente, ou (c) configurar GitHub webhook → EasyPanel auto-deploy.
- [P0][admin] /pedidos/PED-00006 retornava 500 → fix em commit 608b9f5 → **verificado em prod ✓** (PED-00006 carrega após deploy admin disparado anteriormente; demais commits admin desde então estão presos).
- [P2][admin] /pedidos/[id] React hydration error #418 (registrar #24) — backlog
- [feedback] Capturada regra do stakeholder: testar em localhost antes de cada push (memory feedback_test_local_before_push). Reincidência registrada — 5 commits desta sessão pushados sem teste local; daqui em diante: pnpm dev → Playwright localhost → push.

### 13:33–13:54 — Ciclo 3 — fixes P2/P3 com workflow correto (dev local → push)

Stakeholder cobrou regra de testar localhost. Aplicada a partir desta janela. Dev servers: storefront :3100, admin :3101.

- [✓ local] [P0] /checkout: redirect → /carrinho (vê cart vazio) — commit 941fda2 validado em localhost
- [✓ local] [P2] 404 acentos: "Página não encontrada", "você procura", "específico" — commit 742bb92 validado curl
- [✓ local] [P2] /entrar→/carrinho/etc 5 titles próprios — commit 80ad477 validado curl + Playwright
- [✓ local] [P3] /busca sem ?q "O que procura?" — commit b9c1709 validado Playwright
- [✓ local] [P2] HeartButton type=button SSR — commit f0bf354 validado curl
- [✓ local] [P2] /entrar deeplink ?mode=signup|recover — commit 110497a → URL muda ao alternar; deeplink direto OK
- [✓ local] [P2] /colecoes sem texto Placeholder — commit 38f04cf → texto sumiu
- [✓ local] [P2] /login admin divisor órfão "ou com e-mail" — commit 96844ef → sem GOOGLE, divisor não renderiza

[BLOCKER] Deploy EasyPanel storefront E admin presos há >2h. CI verde em todos commits. Sem MCP EasyPanel/token disponível para disparar manualmente. Stakeholder precisa intervir.

### 13:54 — Deploy storefront subiu (parcial)

Storefront deploy foi disparado e subiu commits até `b9c1709`. Fixes verificados em prod:
- ✓ [P0] /checkout 941fda2 (200, redirect funciona)
- ✓ [P2] 404 acentos 742bb92 ("Página não encontrada", "você procura", "específico")
- ✓ [P2] HeartButton f0bf354 (5x `type="button"` no SSR)
- ✓ [P3] Titles 80ad477 (entrar/carrinho/gift-cards/nps/rastreio próprios)
- ✓ [P3] /busca b9c1709 (h1 "O que procura?", title "Busca — Atelier")

Pendentes (commits após b9c1709 — admin OK, storefront aguarda novo deploy):
- ✗ [P2] /entrar deeplink 110497a — h1 muda mas URL não atualiza
- ✗ [P2] /colecoes placeholder 38f04cf — texto ainda visível
- ? [P2] /aparencia changelog e545c37 — admin verificado ✓
- ? [P2] /login divisor 96844ef — admin aguarda re-deploy
- [P2][admin] /login: divisor "ou com e-mail" sem provider OAuth acima quando AUTH_GOOGLE_ID ausente — backlog
- [P0][storefront] /checkout sem itens retorna 404 (não há page.tsx index — só layout + sub-rotas) — backlog
- [P2][storefront] 404 page com typos sem acentuação ("Pagina nao", "voce procura", "Pagina inicial") — backlog
- [P1][storefront] Seed sem produto em estoque — golden path checkout não testável — backlog
- [P2][storefront] /entrar: alternar "Criar conta" não muda URL (sem deeplink) — backlog
- [P2][storefront] /colecoes mostra "Placeholder · imagem da coleção" em prod — backlog
- [P2][storefront] Botão wishlist em PLP card é `type=submit` dentro de `<a>` link — backlog
- [P3][storefront] Dropdown "Minha conta" não condicional por estado de auth — backlog
- [P3][storefront] /busca sem ?q duplica h1 de /produtos — backlog
- [P3][storefront] titles genéricos em /entrar /carrinho /rastreio /gift-cards /nps — backlog

