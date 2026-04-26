# Briefing Claude Design — B) Template jewelry-v1 (storefront da loja de joias BR)

> **Camada:** Template aplicado em instância específica (loja de joias BR). NÃO é Lojeo (sistema). Esta identidade vive APENAS no storefront, NÃO no admin.
> **Bloqueia:** Sprint 2 (storefront).
> **Output esperado:** pacote completo `templates/jewelry-v1/` com design tokens + 3 combinações tipográficas curadas + layouts + componentes + Figma + handoff bundle pra Claude Code.

---

## Contexto do template

`jewelry-v1` é um **template** — um pacote de design + configuração + vocabulário do nicho — que pode ser aplicado a qualquer loja de joias rodando no motor Lojeo. NÃO é a identidade do Lojeo nem da loja de joias específica do laboratório. É um template reutilizável.

O motor Lojeo carrega o template via configuração de instância. Trocar o template muda identidade visual + campos de produto + tom de voz da IA + blocos da homepage. NÃO muda lógica de negócio (que vive no motor).

**Importante:** o **dono da loja de joias** que usar este template precisa poder customizar dentro de limites. O template define o "esqueleto premium curado" com defaults lindos, mas o lojista ajusta:
- Logo, favicon, cores de destaque, fundo
- Combinação tipográfica (entre 3 curadas — não fonte solta)
- Style fotográfico
- Brand guide para a IA (tom, pessoa, palavras)
- Hero da homepage, seções
- Trust signals

Este briefing define o **template jewelry-v1 default** + **as opções de configuração que o admin Lojeo expõe ao lojista**.

## Posicionamento do template

**Joalheria contemporânea acessível-premium** — referência mood: Mejuri + Catbird + Vivara modern line. "Joia diária com cara de luxo."

- Faixa de preço alvo: R$300 a R$5.000 (cobre 80% dos lojistas joia BR MEI/PME)
- Lojista pode reposicionar para luxury (R$5k+) via configs de paleta + tipografia + style fotográfico
- Lojista pode reposicionar para mass-market (R$50-300) trocando combinação tipográfica e fotografia

NÃO é Tiffany clássica (velho-luxo, caro demais para maioria dos MEIs joia). NÃO é Pandora popular (perde a aspiração). É o meio premium-acessível.

## Identidade visual default

### Mood

- Minimalista contemporâneo
- Muito branco/off-white (paper feel)
- Detalhes em dourado fosco (não brilhante de Vegas)
- Fotografia: 60% produto isolado fundo claro + 40% lifestyle/macro detalhe
- Sem gradientes pesados
- Animações sutis: fade, slide curto, parallax suave em hero
- Espaçamento generoso (luxo respira)
- Sombras suaves (não brutalistas)

### Paleta default

```
Background principal:  #FAFAF6  (off-white quente, papel)
Surface (cards):        #FFFFFF  (branco puro pra contraste com produto)
Text primary:          #1A1612  (quase-preto quente, não frio)
Text secondary:        #6B6055
Text muted:            #A89B8C
Accent default:        #B8956A  (dourado fosco, "champagne")
Accent hover:          #9F7E58
Divider:               #E8E2D5
Success (compra):      #5C7A4A  (verde oliva sutil)
Error:                 #A84444  (bordô discreto)
```

### Tipografia — 3 combinações curadas

Lojista escolhe **a combinação inteira** (não fonte solta). Sistema aplica tudo automaticamente — títulos, corpo, preços. Lojista pode ajustar apenas hierarquia de tamanhos (maior/menor) sem quebrar harmonia.

**Combinação A — Clássica refinada (DEFAULT)**
- Display/Títulos: **Cormorant Garamond** (serifa Didone, alta-baixa contraste, herança/luxo atemporal). Pesos: 300, 400, 500, 600.
- Corpo/Preços: **Inter** (sans neutra, clareza). Pesos: 400, 500, 600.
- Mood: clássico atemporal, herança, sofisticação tradicional. Bom para joalherias com peças únicas, alianças, alto valor médio.

**Combinação B — Moderna alto-contraste**
- Display: **Playfair Display** (didone moderna, dramática, alto contraste). Pesos: 400, 500, 700.
- Corpo: **Source Sans 3**. Pesos: 400, 500, 600.
- Mood: editorial, fashion magazine, contemporâneo aspiracional. Bom para coleções tematicas, lançamentos sazonais.

**Combinação C — Minimalista monoespaço**
- Display: **Söhne** (sans grotesque) ou **Inter Display** como fallback free. Pesos: 400, 500, 600.
- Corpo: **JetBrains Mono** (caracteres técnico-luxo, espaçamento intencional). Pesos: 400, 500.
- Mood: ultra-premium, nicho, "joalheria como objeto de design". Bom para joias autorais, designer-makers, peças escultóricas.

### Iconografia

- Lucide icons (mesma família do admin Lojeo) — line style, peso 1.5px, monocromáticos
- Sem ícones cheios/coloridos
- Tamanhos: 16, 20, 24, 32

### Iluminação e profundidade

- Sombras suaves (4-8px blur, opacity 0.04-0.08)
- Sem hard shadows
- Borders sutis (#E8E2D5)
- Estados hover: lift discreto (translateY -2px) + sombra ligeiramente maior

## Configurações expostas ao lojista (no admin Lojeo)

Quando lojista escolhe template `jewelry-v1`, vê opções:

### Identidade da loja
- **Logo** (upload PNG/SVG)
- **Favicon** (gerado automaticamente do logo via IA)
- **Nome da loja**
- **Slogan**

### Cores
- **Cor de destaque** (color picker + presets):
  - Dourado fosco champagne (`#B8956A`) — DEFAULT
  - Prata escovada (`#9CA3A1`)
  - Rosé gold (`#C39B8A`)
  - Cobre antigo (`#8B5A3C`)
  - Preto-rose (`#3A2E2E`)
  - Custom hex
- **Tom do fundo:**
  - Off-white quente (`#FAFAF6`) — DEFAULT
  - Branco puro (`#FFFFFF`)
  - Off-white frio (`#F5F7F7`)
  - Creme (`#F4EFE6`)

### Tipografia
- **Combinação tipográfica:** A (default) | B | C
- **Tamanho hierárquico:** padrão | maior (luxury) | menor (denso)

### Fotografia
- **Style predominante:** isolado (default) | lifestyle | mix
- **Border radius das imagens:** 0 (quadrado) | 8px (sutil — DEFAULT) | 16px (mais redondo)

### Brand guide para IA (afeta IA do Core)
- **Tom:** formal | casual (DEFAULT) | poético
- **Pessoa:** você (DEFAULT) | tu | vocês
- **Pronome de tratamento**
- **Palavras a evitar** (lista)
- **Palavras a preferir** (lista)
- **Slogan**
- **Tagline**
- **Exemplo de copy aprovada** (lojista cola um trecho que representa a marca; IA usa como referência de estilo)

### Homepage
- **Hero:** vídeo | imagem (DEFAULT) | carrossel | grid
- **Seções configuráveis** (admin pode adicionar/remover/reordenar):
  - Hero
  - Coleções em destaque
  - Produtos novos
  - Best-sellers
  - Sobre a marca
  - Depoimentos
  - Galeria UGC
  - Blog/conteúdo
- **Trust signals visíveis:** certificados, garantia, embalagem presente, formas de pagamento

## Layouts a entregar (templates/jewelry-v1/)

1. **Homepage** — hero (vídeo/imagem/carrossel), coleções destaque, produtos featured, sobre a marca breve, UGC, trust signals, footer
2. **PLP (Product Listing Page)** — grid de produtos com filtros laterais (categoria, material, pedra, faixa preço, tamanho), ordenação, paginação ou scroll infinito
3. **PDP (Product Detail Page)** — galeria principal (carrossel de imagens + vídeos), nome, preço (com parcelamento), variantes (material, tamanho, aro), descrição, campos do nicho (material, pedra, quilate, garantia), CTA "Adicionar ao carrinho", "Avise-me quando voltar" se esgotado, badge urgência (X pessoas vendo agora / Y vendidos hoje / Z restantes), avaliações com nota+foto, **slot para galeria UGC (Sprint 10)**, **slot para FrequentlyBoughtTogether (Sprint 11)**, **slot para RelatedProducts (Sprint 11)**, slot para chatbot widget (Sprint 9 — canto inferior direito)
4. **Carrinho** — itens, edição (qty, remover), estimativa frete (CEP), cupom, **slot para YouMayAlsoLike (Sprint 11)**, CTA checkout
5. **Checkout multi-step** — step 1: contato/endereço (CEP autocomplete), step 2: frete (opções), step 3: pagamento (Pix/cartão/boleto), step 4: confirmação. Resumo lateral persistente.
6. **Confirmação de pedido** — número do pedido, próximos passos, link rastreio
7. **Conta do cliente** — sidebar com: meus pedidos, garantias, endereços, **wishlist**, **gift cards**, dados pessoais. Sugestão proativa de recompra na home logada.
8. **Histórico de pedidos** — lista com filtros + detalhe individual (com NF-e, rastreio, abrir troca)
9. **Página de rastreamento branded** — status do envio com identidade visual da loja (não Correios cru)
10. **Páginas estáticas** — Sobre, Política, Trocas, Privacidade (templates editáveis pelo lojista no admin)
11. **Login/cadastro cliente** — minimalista, login social Google + Apple + email/senha
12. **Wishlist (área logada)** — grid de produtos favoritos com botão "comprar" e remover
13. **404 / 500** — branded com identidade jewelry-v1

### Componentes visuais específicos

- **Card de produto** (PLP, recomendações)
- **Galeria principal PDP** (carrossel imagem + vídeo + zoom)
- **Variant selector** (chips para material/tamanho/cor)
- **Badge de urgência** (mostra dado real, nunca falso)
- **Card de avaliação** (estrelas + foto cliente + texto)
- **Galeria UGC slot** (Sprint 10) — "Como nossos clientes usam"
- **Compre o look canvas** (Sprint 10) — foto UGC com tags posicionáveis
- **Chatbot widget** (Sprint 9) — bolha canto inferior direito + estados (minimizado, expandido, digitando, mensagem bot, mensagem humano após escalação) — visualmente segue identidade do template (dourado fosco, tipografia da combinação ativa)
- **Trust signals row** (footer ou checkout)
- **Hero variations** (Sprint 12 — homepage personalizada: cliente novo / cliente recorrente / cliente VIP)

### Estados a cobrir

- Hover (cards, botões, links)
- Foco (acessibilidade)
- Erro (form validation, sem estoque, falha pagamento)
- Vazio (carrinho vazio, sem pedidos, busca sem resultado)
- Loading (skeleton)
- Sucesso (adicionado ao carrinho, pedido confirmado)

### Responsivo

- Mobile-first (60%+ tráfego de joalherias BR é mobile)
- Breakpoints: sm 640, md 768, lg 1024, xl 1280, 2xl 1536
- Hamburger menu mobile, drawer navegação

### Performance e Core Web Vitals

- Imagens otimizadas (WebP + fallback) com lazy loading
- Hero abaixo de 2.5s LCP
- Sem layout shift (reservar dimensões)
- Animações com transform/opacity (não width/height)

## Tom de voz default

- "Você" formal-amigável
- Vocabulário emocional sutil: "peça única", "feita para você", "a sua história"
- Não infantilizar ("queridinha", "fofa") nem ser frio ("produto", "item")
- Microcopy:
  - CTA: "Adicionar ao carrinho", "Finalizar compra", "Avise-me quando voltar"
  - Confirmação: "No carrinho!"
  - Vazio: "Sua lista de desejos está esperando — comece explorando."

Lojista pode ajustar via brand guide (ver configurações acima).

## Formato de entrega

1. **Pacote `templates/jewelry-v1/`** estruturado:
   - `tokens.css` — design tokens em CSS variables (Tailwind v4 compatível)
   - `typography/` — 3 combinações curadas (A, B, C) como módulos selecionáveis
   - `components/` — specs de cada componente
   - `layouts/` — specs de cada layout
   - `config-schema.json` — schema das opções configuráveis pelo lojista
2. **Figma** com auto-layout, variants, e modos para as 3 combinações tipográficas
3. **Mood board** com referências (Mejuri, Catbird, Vivara modern, Pandora rose collection)
4. **Handoff bundle Claude Code** — pacote importável em `templates/jewelry-v1/`

## Restrições

- NÃO usar pedras/joias falsas em mockups (Claude Design usa imagens placeholder respeitando proporção)
- NÃO criar copy específica de produtos (lojista vai cadastrar — a IA do Core gera depois)
- NÃO incluir logo de marca real (Tiffany, Cartier, etc) em mockups — apenas referência conceitual
- NÃO duplicar componentes que já vivem no Lojeo (admin) — template é apenas storefront

## Referências (mood board)

- **Mejuri** (mejuri.com) — mood principal, paleta, fotografia, tipografia
- **Catbird NYC** (catbirdnyc.com) — mood "indie premium", PDP, storytelling
- **Vivara modern line** — referência BR de joalheria contemporânea
- **Vrai** (vrai.com) — checkout limpo, conta cliente
- **Aurate New York** — homepage hierarquia
- **Pandora Rose collection** — paleta rose gold

NÃO usar: Tiffany clássica (velho-luxo, distante), Pandora popular (perde aspiração), H. Stern (legacy bagunçado).

## Pergunta antecipada que Claude Design pode fazer

- **"Quero criar variantes de PDP por tipo de joia (anel, colar, brinco)?"** — Sim, mostrar 3 variantes para validar que template funciona pra qualquer tipo. Anel precisa de seletor de aro, colar de comprimento de corrente, brinco sem variante de tamanho.
- **"Posso usar fotos de produtos reais?"** — Use placeholders de joia genéricos respeitando proporção e estilo. Lojista vai trocar pelas próprias fotos.
- **"Como o template se comporta sem fotos lifestyle?"** — Mostrar fallback graceful (apenas isoladas).
- **"Devo desenhar templates de email transacional?"** — SIM, em escopo: confirmação pedido, Pix gerado, pedido enviado, troca aprovada. Identidade jewelry-v1 aplicada.
- **"E o template coffee-v1?"** — Briefing separado (Checkpoint E, Fase 1.2). NÃO desenhar agora.
