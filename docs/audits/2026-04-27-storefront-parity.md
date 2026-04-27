# Storefront Parity Audit — 2026-04-27

## Resumo executivo

**Score geral: 6.8/10**

### Top 5 gaps críticos
1. **UrgencyBadge não renderizado em PDP** — telemetria ok, badge ausente.
2. **Slot Markers (SlotMark) ausentes** — ref marca slots reservados (FBT/UGC/Related).
3. **ChatbotFAB ausente** — botão flutuante chat na PDP.
4. **Button variant "link" sem seta** — ref usa `→` em links contextuais.
5. **Falta image zoom button na PDP gallery**.

### Top 5 UX bugs
1. `<a onClick>` sem `href` em breadcrumb/PDP/PLP — quebra keyboard nav e CMD+click.
2. ProductCard PLP usa `onClick` em `<a>` sem `href`.
3. Coleções link footer sem prefix resolvido.
4. CEP autocomplete sem feedback visual de loading.
5. Link "Conheça o ateliê" Home sem onClick navegando.

---

## Por tela

### Home — ⚠️ Parcial
- ✅ Hero, Collections, NewArrivals, AboutBrief, UGC gallery, TrustRow
- ⚠️ Faltam slots: PersonalizedHero, RecommendedForYou, ContinueWhereLeftOff, AnonAffinity
- Bugs: Collections sem href fallback, "Ver todas" sem seta visual

### PLP — ⚠️ Parcial
- ✅ Layout 2-col, filtros (Material swatches, Pedra, Preço, Aro), sort, ProductCard grid, pagination numérica
- ⚠️ /colecoes lista coleções sem PLP filtrado dinâmico
- Bugs: ProductCard onClick sem href, pagination hardcoded, filtros sem URL state

### PDP — ❌ Divergente
- ✅ Breadcrumb, gallery + thumbs, swatches, variant picker
- ❌ FALTA: UrgencyBadge, Zoom button, SlotMark, ChatbotFAB, StarRating header
- Bugs: Breadcrumb sem href, NicheFields não dinâmicas, "Avise-me" sem onClick visível

### Cart — ⚠️ Parcial
- ✅ Items, sticky resumo, CEP, cupom, CTA, empty state
- ⚠️ FALTA: YouMayAlsoLike (RESOLVIDO 2026-04-27)
- Bugs: CEP heurística local, cupom "Aplicar" sem disabled state, "continuar comprando" sem href

### Checkout — ✅ Aderente
- ✅ Stepper, 4 steps, sticky resumo
- Bugs: validação email regex ausente, Cartão parcelas hardcoded [1-6], QR Pix placeholder

### Account — ✅ Aderente
- ✅ Greeting, ProactiveCard, Last order, Orders+Drawer+Timeline, Tracking branded
- Bugs: Timeline ETA sem lógica real, "Abrir troca" sem onClick, filter pills sem URL state

### Auth — ✅ Aderente
- ✅ 2-col split, login/signup/recover
- Bugs: Social btns design-only (na real NextAuth ok), password sem show/hide, ToS sem href

### Static — ✅ Aderente
- ✅ Sobre, Política, Trocas, Termos, 404
- Bugs: 404 não renderiza msg custom no notFound() de produto, links sem target=_blank

### Chrome global — ⚠️ Parcial
- ✅ Header sticky, nav, logo center, ícones, footer 3-col + newsletter
- ⚠️ FALTA: search input expansível, mobile hamburger
- Bugs: user menu dropdown links sem href, newsletter sem disabled enviando

---

## Patches sugeridos (priorizado, ≤30min cada)

| # | Arquivo | Fix | Tempo |
|---|---------|-----|-------|
| 1 | `apps/storefront/src/components/products/pdp-client.tsx` | Renderizar UrgencyBadge (viewers/low-stock) | 15min |
| 2 | `apps/storefront/src/app/produtos/[slug]/page.tsx` | Adicionar `<SlotMark>` antes de FBT/UGC/Related | 10min |
| 3 | PDP page | ChatbotFAB floating button | 20min |
| 4 | PDP gallery | Zoom button canto inferior direito | 15min |
| 5 | breadcrumb/PLP/Home | Trocar `<a onClick>` por `<Link href>` | 30min |
| 6 | A11y | Image alt mais descritivo | 20min |
| 7 | PLP filters | Persistir filtros em URL search params | 45min |
| 8 | Pagination | Estado dinâmico pagination | 45min |
| 9 | Coupon | Disabled state quando vazio | 5min |
| 10 | CEP | Loading visual + integração ViaCEP | 30min |

**Débito total:** ~4.5h de polimento (visual + a11y + state management)
