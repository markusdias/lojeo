# Para colar no Claude Design — Sessão B: Template jewelry-v1 (storefront joias BR)

## Campo 1 — "Company name and blurb"

```
Template jewelry-v1: pacote de design + configuração + vocabulário aplicado em storefront de loja de joias BR rodando no motor Lojeo. NÃO é a marca Lojeo (sistema/admin) — é identidade de NICHO joalheria, aplicada na storefront que clientes finais veem. Posicionamento: joalheria contemporânea acessível-premium (R$300–R$5.000), referência mood Mejuri + Catbird + Vivara modern. Template precisa expor configurações para o dono da loja customizar dentro de limites (cor accent, tipografia entre 3 combinações curadas, fotografia, brand guide para IA, hero, seções).
```

## Campo 2 — Assets para upload

- **Code on GitHub:** (vazio — repo será criado)
- **.fig file:** (vazio — Claude Design gera do zero)
- **Fonts/logos/assets:** (vazio — Claude Design propõe combinações tipográficas)

## Campo 3 — "Any other notes?"

```
ESTE É UM TEMPLATE REUTILIZÁVEL — não a loja final. Define defaults lindos + opções configuráveis pelo lojista no admin Lojeo. Lojista NÃO escolhe fonte solta — escolhe combinação inteira pré-curada (sistema aplica tudo).

Mood default:
- Minimalista contemporâneo, premium acessível
- Muito branco/off-white (paper feel), detalhes em dourado fosco (NÃO amarelo Vegas)
- Espaçamento generoso (luxo respira), sombras suaves
- Animações sutis (fade, slide curto)
- Inspirações: Mejuri (mejuri.com), Catbird NYC (catbirdnyc.com), Vivara modern line, Vrai (vrai.com), Aurate New York
- NÃO usar: Tiffany clássica (velho-luxo), Pandora popular (perde aspiração), H. Stern (legacy bagunçado)

Paleta DEFAULT:
- Background: #FAFAF6 (off-white quente, papel)
- Surface (cards): #FFFFFF
- Text primary: #1A1612 (quase-preto quente)
- Text secondary: #6B6055
- Text muted: #A89B8C
- Accent: #B8956A (dourado fosco champagne) — hover #9F7E58
- Divider: #E8E2D5
- Success #5C7A4A (verde oliva sutil), error #A84444 (bordô discreto)

Tipografia — 3 COMBINAÇÕES CURADAS (lojista escolhe a inteira):
- Combinação A (DEFAULT, clássica refinada): Cormorant Garamond (display) + Inter (corpo). Mood: atemporal, herança, sofisticação tradicional.
- Combinação B (moderna alto-contraste): Playfair Display (display) + Source Sans 3 (corpo). Mood: editorial fashion magazine.
- Combinação C (minimalista monoespaço): Söhne ou Inter Display (display) + JetBrains Mono (corpo). Mood: ultra-premium, joalheria como objeto de design.

Configurações expostas ao lojista no admin (todas precisam funcionar visualmente):
- Logo, favicon, nome da loja, slogan
- Cor accent (presets: dourado fosco / prata escovada / rosé gold / cobre antigo / preto-rose / custom hex)
- Tom do fundo (off-white quente / branco puro / off-white frio / creme)
- Combinação tipográfica A/B/C + tamanho hierárquico (padrão/maior/menor)
- Style fotográfico predominante (isolado / lifestyle / mix)
- Border radius imagens (0 / 8 / 16)
- Brand guide IA (tom: formal/casual/poético, pessoa: você/tu/vocês, palavras evitar/preferir, slogan, tagline, exemplo copy)
- Hero (vídeo / imagem / carrossel / grid)
- Seções homepage (hero, coleções, produtos novos, best-sellers, sobre, depoimentos, UGC, blog)
- Trust signals (certificados, garantia, embalagem, pagamentos)

Layouts a entregar:
1. Homepage (hero, coleções destaque, produtos featured, sobre breve, UGC, trust signals)
2. PLP com filtros laterais (categoria, material, pedra, faixa preço, tamanho, aro), ordenação, paginação
3. PDP — galeria carrossel imagem+vídeo+zoom, variantes (material/tamanho/aro), descrição, campos nicho (material/pedra/quilate/garantia), CTA, "Avise-me quando voltar" se esgotado, badge urgência REAL (X pessoas vendo agora / Y vendidos hoje / Z restantes), avaliações com nota+foto
4. Slots reservados na PDP: galeria UGC (Sprint 10), chatbot widget canto inferior direito (Sprint 9), recomendações Related/FrequentlyBoughtTogether/YouMayAlsoLike (Sprint 11), hero personalizado (Sprint 12)
5. Carrinho (itens, edição, estimativa frete CEP, cupom, slot YouMayAlsoLike)
6. Checkout multi-step (contato/endereço com CEP autocomplete → frete → pagamento → confirmação) com resumo lateral persistente
7. Conta cliente: pedidos, garantias, endereços, wishlist, gift cards, dados; sugestão proativa de recompra na home logada
8. Histórico de pedidos com NF-e + rastreio + abrir troca
9. Página rastreamento BRANDED (não Correios cru)
10. Páginas estáticas (Sobre, Política, Trocas, Privacidade)
11. Login/cadastro cliente (Google + Apple + email/senha)
12. Wishlist (área logada)
13. 404/500 branded
14. Templates email transacional (confirmação pedido, Pix gerado, pedido enviado, troca aprovada)

Componentes específicos:
- Card de produto (PLP, recomendações)
- Galeria principal PDP (carrossel)
- Variant selector (chips)
- Badge de urgência (mostra dado REAL, NUNCA falso)
- Card de avaliação (estrelas + foto + texto)
- Galeria UGC slot
- Compre o look canvas (foto UGC com tags posicionáveis)
- Chatbot widget (FAB canto inferior direito) — segue identidade do template, NÃO Lojeo
- Trust signals row

Tom de voz default:
- "Você" formal-amigável
- Vocabulário emocional sutil ("peça única", "feita para você", "a sua história")
- NÃO infantilizar ("queridinha", "fofa") nem ser frio ("produto", "item")
- Lojista pode customizar via brand guide

Mobile-first (60%+ tráfego mobile). Breakpoints sm 640, md 768, lg 1024, xl 1280, 2xl 1536.
Performance: imagens WebP + lazy loading, hero LCP <2.5s, sem layout shift, animações em transform/opacity.
Acessibilidade WCAG 2.1 AA.

Restrições:
- NÃO incluir logos de marcas reais (Tiffany, Cartier) em mockups — apenas referência conceitual
- NÃO criar copy específica de produtos (lojista vai cadastrar, IA gera)
- NÃO duplicar componentes do admin Lojeo — template é apenas storefront
- Sem dark patterns (urgência falsa, escassez fake)

Output esperado: pacote templates/jewelry-v1/ com tokens.css (CSS variables Tailwind v4), 3 combinações tipográficas como módulos selecionáveis, components/ specs, layouts/ specs, config-schema.json das opções configuráveis, Figma com modos para 3 combinações, handoff bundle Claude Code.
```

---

## Notas para o stakeholder antes de iniciar sessão

- Esta é Sessão **B**. Pode ser feita em paralelo com Sessão **A** (Lojeo system).
- Sessão **D** (componentes IA no storefront jewelry-v1) usa este template como base — fazer DEPOIS desta.
- Quando Claude Design perguntar:
  - **Variantes de PDP por tipo de joia (anel/colar/brinco):** sim, mostrar 3 variantes pra validar template universal
  - **Fotos reais de produto:** placeholders de joia genéricos respeitando proporção
  - **Templates de email transacional:** SIM, em escopo (confirmação, Pix, envio, troca)
  - **Template coffee-v1:** NÃO desenhar agora (Sessão E, Fase 1.2)

Briefing detalhado completo (referência interna): `docs/design-briefs/B-template-jewelry-v1.md`
