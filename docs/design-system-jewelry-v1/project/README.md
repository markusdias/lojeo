# Jewelry‑v1 — Storefront Template (Lojeo)

> **Pacote de template reutilizável** de identidade visual + configuração + vocabulário aplicado em storefronts de **joalheria contemporânea acessível‑premium** rodando no motor **Lojeo**.
> Este NÃO é o admin Lojeo (sistema). É o **nicho de joalheria** que clientes finais veem.

---

## 1 · Contexto

**Lojeo** é o motor de e‑commerce; a identidade Lojeo (admin/sistema) **não aparece** no storefront.
**Jewelry‑v1** é um dos templates de nicho que rodam sobre Lojeo. Ele entrega:

- **Defaults lindos** prontos para o lojista publicar imediatamente.
- **Configurações curadas** que o lojista escolhe no admin (cor accent, combinação tipográfica, fotografia, brand‑guide para IA, hero, seções da home).
- **Limites estéticos**: o lojista escolhe **combinações inteiras pré‑curadas**, nunca fontes soltas. O sistema garante que toda customização permaneça coerente.

### Posicionamento de marca

| Eixo | Posição |
|---|---|
| Faixa de preço | R$ 300 – R$ 5.000 (acessível‑premium) |
| Mood | Minimalista contemporâneo, papel + dourado fosco |
| Inspirações conceituais | Mejuri · Catbird NYC · Vivara modern · Vrai · Aurate New York |
| Distância de | Tiffany clássica (velho‑luxo), Pandora (popular), H. Stern (legacy bagunçado) |
| Mobile share | 60%+ do tráfego — **mobile‑first obrigatório** |

### Configurações expostas ao lojista

- Identidade: logo, favicon, nome da loja, slogan
- **Cor accent**: dourado fosco · prata escovada · rosé gold · cobre antigo · preto‑rose · custom hex
- **Tom de fundo**: off‑white quente · branco puro · off‑white frio · creme
- **Combinação tipográfica**: A (Cormorant + Inter) · B (Playfair + Source Sans) · C (Inter Display + JetBrains Mono) — sempre o pacote inteiro
- **Tamanho hierárquico**: padrão · maior · menor
- **Style fotográfico**: isolado · lifestyle · mix
- **Border radius imagens**: 0 · 8 · 16
- **Brand guide IA**: tom · pessoa · vocabulário evitar/preferir · slogan · tagline · exemplo copy
- **Hero**: vídeo · imagem · carrossel · grid
- **Seções homepage**: hero · coleções · novos · best‑sellers · sobre · depoimentos · UGC · blog
- **Trust signals**: certificados · garantia · embalagem · pagamentos

### Sources / referências do brief
- Brief original do template (entrada do usuário em 25/Apr/2026).
- Mood references conceituais (não se copiou nada visual/codigo de):
  - https://mejuri.com
  - https://catbirdnyc.com
  - https://vrai.com
  - Aurate New York
  - Vivara linha modern

> **Nenhum codebase ou Figma foi anexado.** Este template foi construído a partir do spec do brief; valores numéricos (paleta, type ramp, espaçamento) seguem o brief literalmente. Ajustar caso o lojista ou o time de design tenham referências adicionais.

---

## 2 · Index do pacote

```
.
├── README.md                  ← este arquivo (visão geral, content + visual + iconography)
├── SKILL.md                   ← entrada Agent‑Skills compatível
├── colors_and_type.css        ← CSS variables: tokens base + semânticos
├── config-schema.json         ← schema das opções configuráveis no admin
├── fonts/                     ← (Google Fonts via CDN — ver nota)
├── assets/                    ← logos, ícones, imagens placeholder
├── preview/                   ← cards do Design System tab
└── ui_kits/
    └── storefront/
        ├── README.md
        ├── index.html         ← protótipo click‑thru da homepage + PDP + carrinho
        └── *.jsx              ← componentes
```

Veja [`SKILL.md`](./SKILL.md) para usar este pacote como skill em outro agente Claude.

---

## 3 · Content fundamentals

A copy é o que separa "joalheria nicho premium" de "ecommerce genérico". Regras default; o lojista pode sobrepor via brand guide no admin.

### Tom de voz

- **Pessoa default**: "você" formal‑amigável (nem "tu", nem "vocês", nem "senhor/a").
- **Registro**: emocional sutil + factual. Nem frio (`produto`, `item`, `SKU`) nem infantilizado (`queridinha`, `fofa`, `xodó`).
- **Postura**: a peça é a protagonista. A copy serve à peça. Frases curtas. Verbos no presente.
- **Casing**: Sentence case em títulos e botões. **NUNCA** ALL CAPS em parágrafos. ALL CAPS só em micro‑labels (badges, eyebrows) com `letter-spacing: 0.12em`.

### Vocabulário

| Prefira | Evite |
|---|---|
| peça, criação, modelo | produto, item, SKU |
| feita à mão, finalizada à mão | manufaturado |
| ouro 18k, prata 925 | metal, dourado (sem qualificar) |
| acabamento fosco/polido | textura, efeito |
| sua história, sua coleção | o cliente, o usuário |
| esgotado · em produção · disponível | unavailable, out of stock |

### Exemplos de copy

```
✓ "Aliança Solitário · ouro 18k, diamante 0,15ct"
✗ "Produto: Aliança · Material: Ouro · Pedra: Diamante"

✓ "Feita sob encomenda em até 15 dias úteis."
✗ "ATENÇÃO! Entrega em até 15 dias!!!"

✓ "Avise‑me quando voltar"
✗ "Notify me"  ✗ "Cadastre seu email"

✓ "Esgotado nesta variante. Em ouro branco, ainda disponível."
✗ "Produto indisponível"
```

### Microcopy de urgência (apenas dados REAIS)

- ✓ "12 pessoas vendo agora"  (se telemetria real)
- ✓ "Restam 3 unidades"        (se estoque real)
- ✓ "Vendido 4 vezes hoje"     (se telemetria real)
- ✗ "ÚLTIMAS HORAS!" "OFERTA RELÂMPAGO!" (sem dado real por trás)

### Emoji & símbolos

- **Não usar emoji** em UI nem na copy — quebra o registro premium.
- Use **·** (middle dot, U+00B7) como separador inline em listas curtas (`ouro 18k · diamante 0,15ct`).
- Use **—** (em‑dash) para pausa retórica, nunca `--`.

---

## 4 · Visual foundations

### 4.1 Cores (default — lojista pode trocar accent + tom de fundo)

```
Background       #FAFAF6   off‑white quente, papel
Surface (cards)  #FFFFFF
Text primary     #1A1612   quase‑preto quente
Text secondary   #6B6055
Text muted       #A89B8C
Accent           #B8956A   dourado fosco champagne
Accent hover     #9F7E58
Divider          #E8E2D5
Success          #5C7A4A   verde oliva sutil
Error            #A84444   bordô discreto
```

**Vibe da imagem**: warm, levemente desaturado, leve grain natural (não filtro). Iluminação suave, sombra longa. Nunca b&w hard, nunca cool/azulado, nunca alta saturação.

### 4.2 Tipografia — três combinações curadas

O lojista escolhe a **combinação inteira**. Cada combinação é um pacote completo: display + body + escala + tracking.

| Combo | Display | Body | Mood |
|---|---|---|---|
| **A · default** | Cormorant Garamond | Inter | Atemporal, herança, sofisticação tradicional |
| **B · editorial** | Playfair Display | Source Sans 3 | Editorial fashion magazine, alto contraste |
| **C · objeto‑design** | Inter Display | JetBrains Mono | Ultra‑premium, joalheria como objeto |

Tamanho hierárquico: 3 escalas (padrão / maior / menor) aplicadas como multiplicador global na ramp.

> **Substituição de fontes**: todas as 5 famílias estão no Google Fonts e são linkadas via CDN no `colors_and_type.css`. **Inter Display** não existe oficialmente — substituí por **Inter** com `font-feature-settings: "ss01", "cv11"` e tracking apertado, que é a recomendação Rasmus Andersson para esse uso. **Flag para o user**: se quiserem Söhne ou Inter Display real, precisa licença comercial (Klim/Rasmus).

### 4.3 Espaçamento & ritmo

- Escala base **4px**. Tokens: `--sp-1`=4 · `-2`=8 · `-3`=12 · `-4`=16 · `-6`=24 · `-8`=32 · `-12`=48 · `-16`=64 · `-24`=96 · `-32`=128.
- **Espaçamento generoso** é parte do mood — luxo respira. Páginas usam `--sp-16`/`--sp-24` entre seções, não `--sp-8`.
- Container: `max-width: 1280px`, padding lateral `clamp(16px, 5vw, 64px)`.

### 4.4 Backgrounds & superfícies

- Fundo de página: cor sólida (`--bg`).
- **Sem gradientes** decorativos. Sem patterns. Sem texturas geradas em CSS.
- Hero pode ser imagem full‑bleed ou vídeo full‑bleed; sobreposição opcional `rgba(26,22,18,0.15)` para legibilidade — nunca mais que 30%.
- Cards: `background: var(--surface)`, sem border, **sombra muito sutil** (`--shadow-sm`).

### 4.5 Sombras

```
--shadow-sm:    0 1px 2px rgba(26,22,18,0.04)
--shadow-md:    0 4px 16px rgba(26,22,18,0.06)
--shadow-lg:    0 12px 32px rgba(26,22,18,0.08)
--shadow-image: 0 20px 60px rgba(26,22,18,0.12)
```

Só usar `lg`/`image` em produtos em destaque ou modais. Default é `sm` ou nenhuma.

### 4.6 Border radius

| Token | px | Uso |
|---|---|---|
| `--r-none` | 0 | Default para imagens em estética editorial |
| `--r-sm` | 2 | Inputs, chips |
| `--r-md` | 8 | Botões, cards (default) |
| `--r-lg` | 16 | Modais, hero cards |
| `--r-pill` | 999 | Badges, pills |

Lojista escolhe radius global de imagens entre 0 / 8 / 16.

### 4.7 Bordas

Bordas finas (`1px`), cor `--divider` (#E8E2D5). Nunca borda preta sólida. Em hover de chip de variante: borda `2px var(--text-primary)` (sem fill).

### 4.8 Animação

- **Easing default**: `cubic-bezier(0.22, 1, 0.36, 1)` (out‑expo suave).
- **Durations**: micro 120ms · padrão 240ms · entrada de página 480ms.
- **Permitido**: fade, slide curto (≤16px), scale sutil (0.98 → 1.0).
- **Proibido**: bounce, spring exagerado, parallax pesado, rotações, partículas.
- Apenas em `transform` e `opacity` (performance).
- Respeitar `prefers-reduced-motion: reduce` → desativa todas exceto fades de 80ms.

### 4.9 Estados (hover, press, focus, disabled)

| Elemento | Hover | Press | Focus | Disabled |
|---|---|---|---|---|
| Botão primário | bg → `--accent-hover`, shadow‑sm | scale 0.98 | outline 2px `--accent` offset 2 | opacity 0.4 |
| Botão ghost | bg `rgba(26,22,18,0.04)` | bg `rgba(26,22,18,0.08)` | mesma | opacity 0.4 |
| Link | underline appear | text → `--accent-hover` | outline | — |
| Card de produto | imagem scale 1.03 (overflow hidden), preço fade | — | outline 2px `--accent` | — |
| Chip variante | borda `--text-primary` | scale 0.98 | outline | strikethrough + opacity 0.4 |

**Nunca** mudar cor de fundo da página em hover. **Nunca** trocar acento por azul de sistema.

### 4.10 Layout

- **Mobile‑first**. Breakpoints: sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536.
- **Grid de produtos**: 2 colunas mobile · 3 tablet · 4 desktop · 5 wide. Gap `--sp-6` mobile, `--sp-8` desktop.
- **Header**: sticky, 64px mobile / 80px desktop, `backdrop-filter: blur(12px)` quando rolar para baixo.
- **Footer**: dark variant — fundo `#1A1612`, texto `#FAFAF6`. Único lugar onde usamos modo escuro.

### 4.11 Transparência & blur

- `backdrop-filter: blur(12px)` no header sticky e em modais (overlay `rgba(250,250,246,0.7)`).
- Glass effects em cards: **não usar**. Mantém o look papel.

### 4.12 Acessibilidade

- WCAG 2.1 AA mínimo. Texto secundário sobre `--bg` tem contrast ratio 4.6:1 ✓. Accent sobre branco 3.4:1 — **só para ícones grandes ou com texto secundário**, não para CTAs com texto pequeno.
- Botões CTA usam texto `--surface` sobre `--text-primary` (`#1A1612`) → contrast 16:1.
- `:focus-visible` sempre visível, nunca `outline: none` sem substituto.
- Todos hit‑targets ≥ 44×44 px (mobile).

---

## 5 · Iconography

**Sistema escolhido: Lucide** ([lucide.dev](https://lucide.dev)) — linha 1.5px, traços arredondados, peso uniforme. Casa visualmente com a estética minimalista premium e tem cobertura completa para e‑commerce (heart, search, user, shopping‑bag, x, chevron‑*, plus, minus, check, truck, shield, gift, star, etc).

> **Nota**: o brief não anexou um icon set proprietário, então adotei Lucide como default, linkado por CDN. Se o lojista tiver um set custom, substituir mantendo: stroke 1.5px, arredondado, monocromático `currentColor`. **Nunca misturar** Lucide com outro set na mesma tela.

### Regras de uso

- **Cor**: sempre `currentColor`. Default herda `--text-primary`.
- **Tamanho**: 16 (inline em texto) · 20 (default UI) · 24 (header/CTA) · 32 (vazio/ilustrativo). Nada entre.
- **Stroke**: nunca alterar — Lucide já vem 1.5.
- **Fill**: só em estados ativos (heart cheio = wishlist; star cheia = avaliação). Fill nunca colorido — sempre `currentColor`.
- **Pareamento com texto**: ícone vem **antes** do label, gap `--sp-2`. Mesma altura visual do texto (icon 20 + text 16 ok).

### Emoji

**Não usar.** Em nenhum lugar da UI nem da copy. Quebra o registro premium.

### Unicode como ícone

Permitido para separadores e símbolos tipográficos:
- `·` middle dot — separador inline
- `—` em‑dash — pausa retórica
- `★ ☆` estrelas de avaliação **só no fallback noscript**; UI viva usa Lucide `star`.
- `→ ←` flechas só em links de "ver mais" no rodapé.

### Logos & marca

- O template entrega um **logo placeholder neutro** (`assets/logo-placeholder.svg`) — wordmark serifado em Cormorant Garamond por default. Lojista substitui no admin.
- Favicon placeholder em `assets/favicon.svg` — diamante minimalista geométrico.

---

## 6 · Performance & technical

- Imagens **WebP** com `<picture>` fallback JPEG. `loading="lazy"` exceto hero (eager + `fetchpriority="high"`).
- Hero LCP target **< 2.5s**. Hero image preload via `<link rel="preload" as="image">`.
- Sem layout shift (CLS = 0): toda imagem com `width`/`height` ou `aspect-ratio` definido.
- Animações apenas `transform` + `opacity` (compositor‑only).
- Fonts: `font-display: swap` + preload das duas famílias da combinação ativa.

---

## 7 · Restrições

- ❌ Não incluir logos reais (Tiffany, Cartier, Vivara) em nenhum mockup.
- ❌ Não criar copy específica de produto (lojista cadastra; IA gera).
- ❌ Não duplicar componentes do admin Lojeo — template é só storefront.
- ❌ Sem dark patterns: zero urgência falsa, zero scarcity fake, zero countdown fake.
- ❌ Não introduzir nova fonte ou cor sem passar pelo schema de configuração.

---

## 8 · UI kit

Veja [`ui_kits/storefront/`](./ui_kits/storefront/) para um protótipo click-thru cobrindo home → PLP → PDP → carrinho → wishlist, com componentes JSX modulares (`Primitives.jsx`, `Chrome.jsx`, `Home.jsx`, `PLP.jsx`, `PDP.jsx`, `Cart.jsx`, `App.jsx`).

## 9 · CAVEATS — leia

1. **Sem Figma/codebase anexado**: este template foi construído puramente do brief escrito. Valores literais do brief foram respeitados; tudo mais é decisão de design defensível mas não validada contra mockups.
2. **Inter Display** substituído por **Inter** com features tipográficas (não existe Inter Display oficial; Söhne requer licença Klim).
3. **Logo & favicon** são placeholders neutros — substituir antes de publicar.
4. **Iconografia**: adotei Lucide via CDN por ausência de set proprietário no brief.
5. **Imagens de produto** nos mockups usam placeholders cinza/papel — não usei imagens reais para evitar copyright e porque o brief diz que o lojista cadastra os produtos.
