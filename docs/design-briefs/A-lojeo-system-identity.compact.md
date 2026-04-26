# Para colar no Claude Design — Sessão A: Lojeo (sistema)

## Campo 1 — "Company name and blurb"

```
Lojeo: motor de e-commerce SaaS brasileiro para MEI/PME, com IA nativa profunda como diferencial. Admin web (todas instâncias) + storefront (via templates plugáveis por nicho — joias, café, etc). Posicionamento: "Apple do e-commerce BR" — premium acessível, qualidade Linear/Vercel com calor brasileiro. Esta sessão desenha a IDENTIDADE DO SISTEMA LOJEO (marca corporativa + design system do admin) — NÃO os templates de loja, que têm sessões próprias.
```

## Campo 2 — Assets para upload

- **Code on GitHub:** (vazio agora — repo será criado no Sprint 0)
- **.fig file:** (vazio — Claude Design vai gerar do zero)
- **Fonts/logos/assets:** (vazio — Claude Design propõe logo + buscar Inter/JetBrains Mono no Google Fonts)

## Campo 3 — "Any other notes?"

```
Marca:
- Nome: lojeo (sempre minúsculas — humilde, acessível, moderno)
- Wordmark + símbolo geométrico minimalista (referência: Vercel ▲, Linear ◢, Stripe ≋ — abstrato, NÃO usar carrinho/sacola/etiqueta)
- Inspirações de mood: Linear, Vercel, Notion, Stripe, Apple System Settings (clareza extrema, organização, clean, premium-acessível)
- NÃO usar mood: Shopify (loja-cara), Wix (visual bagunçado), Bling/Olist (legacy BR)

Paleta (monocromática + 1 accent, estilo Apple):
- Off-white quente #FAFAF7 (background)
- Surface #FFFFFF
- Cinzas: #F5F5F5, #E5E5E5, #D4D4D4, #A3A3A3, #737373, #404040, #262626, #171717
- Preto suave #0A0A0A (text primary)
- ACCENT: verde profundo brasileiro #00553D (hover #007A57, dark #00302A) — diferencia de azul SaaS gringo, conota dinheiro/sucesso/aspiração financeira BR
- Semânticas: success #10B981, warning #F59E0B, error #EF4444, info #3B82F6
- Dark mode: inverter base mantendo accent

Tipografia:
- Display + body: Inter (variable font, 100-900, free, suporte português perfeito)
- Code/data: JetBrains Mono (tabelas, valores monetários, IDs)
- Pesos usados: 400, 500, 600, 700 (evitar 900)

Tema admin: Light default + Dark via toggle (persiste por user)
Densidade: Espaçoso (Stripe-style) com modo "compacto" opcional em listas/tabelas

Tom de voz:
- Português brasileiro real (NUNCA traduzido do inglês)
- "Você" formal-amigável (não "tu", não "vós")
- Microcopy: "Tudo certo!", "Vendido!", "Não rolou — vamos tentar de novo?", "Um instante…"
- Inspiração tom: Stripe (técnico-claro) + iFood (BR-amigável). NÃO infantilizar (sem "queridinha", "fofa") nem usar gírias datadas.

Princípios UX admin:
- "Fator moleza" — toda tela tem instrução contextual; lojista MEI/PME nunca precisa ajuda externa
- Estados vazios bem desenhados (primeira vez na loja sem dados)
- Errors amigáveis, sempre próxima ação clara
- Confirmações para ações destrutivas

Iconografia: Lucide icons (line, peso 1.5px, monocromáticos). Tamanhos 16/20/24/32. SEM ícones cheios coloridos.

Restrições:
- Sem ilustrações cartoon/3D
- Sem mascote/personagem
- Sem gradientes pesados (gradiente sutil OK para "AI badge")
- Sem dark patterns (urgência falsa, opt-in confuso)

Layouts prioritários (em ordem):
1. Login admin (OAuth Google primary, Apple/email/senha fallback)
2. Dashboard principal (métricas + gráficos + alertas + margem)
3. Lista + detalhe de produtos (com variantes, galeria, fiscal, garantia)
4. Lista + detalhe de pedidos (timeline de status)
5. Configurações (tabs: identidade, gateways OAuth-1-clique, frete, email, equipe, IA)
6. Equipe e permissões (roles + 2FA + convites)
7. Filas: moderação avaliações, trocas, pedidos pendentes
8. Página de cliente CRM (perfil + LTV + RFM + garantias)

Componentes-base: navegação sidebar+topbar, botões (primary/secondary/ghost/destructive), inputs todos tipos, cards, badges, tables (denso/espaçoso, sortable, filterable, batch actions), modais, drawers, toasts, charts (Recharts: line/bar/donut/funnel/sparkline), AI badge sutil, "Connected via OAuth" status pill, health indicator (verde/amarelo/vermelho).

Acessibilidade WCAG 2.1 AA mínimo. Foco visível em todos elementos interativos.

Output esperado: design tokens em CSS variables (Tailwind v4 compatível), Figma com auto-layout + variants, handoff bundle Claude Code para importar em packages/ui/.
```

---

## Notas para o stakeholder antes de iniciar sessão

- Esta é Sessão **A**. Faça depois Sessão **B** (template jewelry-v1) — pode ser em paralelo.
- Sessão **C** (IA features no admin) usa o design system gerado nesta sessão como base — fazer DEPOIS desta.
- Quando Claude Design perguntar:
  - **Variantes do logo:** sim (light bg, dark bg, monocromático preto, monocromático branco)
  - **Mascote/personagem:** NÃO
  - **Outros idiomas:** Fase 1 só PT-BR (Inter suporta tudo, não precisa criar variantes)
  - **Animação do logo:** desejável versão sutil para splash/marketing

Briefing detalhado completo (referência interna): `docs/design-briefs/A-lojeo-system-identity.md`
