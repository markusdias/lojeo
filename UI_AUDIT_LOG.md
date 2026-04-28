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

