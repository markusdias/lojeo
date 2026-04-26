# Para colar no Claude Design — Sessão D: Componentes IA no storefront jewelry-v1

> **PRÉ-REQUISITO:** Sessão B (template jewelry-v1) já concluída. Estes componentes ESTENDEM o template jewelry-v1. Reusar tokens, paleta, tipografia já gerados em B.

## Campo 1 — "Company name and blurb"

```
jewelry-v1 AI components: extensão do template jewelry-v1 (sessão anterior) cobrindo componentes que aparecem no STOREFRONT da loja de joias e usam IA do Core Lojeo — chatbot widget, recomendações (Related/FrequentlyBoughtTogether/YouMayAlsoLike), hero personalizado por perfil de cliente, sugestão de recompra na conta cliente, busca semântica visual, "avise-me quando voltar". TODOS reusam tokens do template jewelry-v1 (dourado fosco accent, paleta off-white, combinação tipográfica ativa). A INTELIGÊNCIA vem do Core Lojeo, mas a CARA visual segue identidade do template — nunca quebrar coerência.
```

## Campo 2 — Assets para upload

- **Code on GitHub:** linkar repo Lojeo (após Sprint 0)
- **.fig file:** anexar Figma da Sessão B (template jewelry-v1) para Claude Design herdar
- **Fonts/logos/assets:** já em B — não duplicar

## Campo 3 — "Any other notes?"

```
ESTENDER o template jewelry-v1 já criado na sessão B. Reusar tokens, cores (dourado fosco champagne, off-white), tipografia (3 combinações curadas), sombras, animações.

Princípios:
1. IA INVISÍVEL pro cliente — NÃO mostrar badge "AI", NÃO usar copy "nossa IA recomenda"; só mostrar resultado relevante
2. Coerência total com template — chatbot, recomendações respeitam paleta/tipografia/mood do template (sem identidade de "feature de IA")
3. Discreto e premium — joalheria premium NÃO tem widget chat berrante
4. Mobile-first — maioria tráfego mobile

Componentes a entregar:

1) CHATBOT WIDGET STOREFRONT (Sprint 9)
- Posição: canto inferior direito sticky
- Estado fechado FAB: bolha 48px diâmetro, accent dourado fosco, ícone sutil "sparkle" ou "•••" minimalista (NÃO chat bubble cartoon)
- Hover: lift discreto + tooltip "Posso ajudar?"
- Animação entrada: fade-in 1s APÓS scroll inicial (deixar cliente olhar loja primeiro)
- Estado aberto: painel flutuante 380px desktop, full-width mobile com slide-up
- Header: avatar/símbolo da loja, nome configurável ("Atendimento [Loja]"), status online/offline, minimizar e fechar
- Body: mensagem boas-vindas CONTEXTUAL ("Vejo que está olhando o anel Aurora — posso ajudar?"), sugestões rápidas chips ("Tabela de aros", "Prazo de entrega", "Política de troca", "Falar com humano"), histórico mensagens scroll automático
- Bot bubble: alinhado esquerda, surface #FFFFFF com border sutil, tipografia corpo do template
- Pode incluir card produto inline (mini do mesmo card da PLP) quando bot sugere
- Cliente bubble: alinhado direita, accent dourado fosco com texto contrastante
- Footer: input "Pergunte sobre joias, frete, prazo…", botão enviar, micro "Posso enganar — confirme em [WhatsApp]"
- Estados: bot digitando (3 pontos animados), pensando profundo (sparkle + "Procurando…"), erro (CTA WhatsApp), escalado humano (badge muda)
- Mobile: aberto = slide-up cobrindo viewport

2) CARD PRODUTO EM RECOMENDAÇÃO (Sprint 11)
- Estende card produto da Sessão B com 3 variantes:
- RelatedProducts (PDP): carrossel horizontal abaixo descrição, header "Você também pode gostar", 4-6 cards desktop / scroll mobile
- FrequentlyBoughtTogether (PDP+carrinho): card combo com produto principal + 1-2 sugestões + preço total + CTA "Adicionar combo" (com desconto opcional), layout horizontal com "+" entre produtos
- YouMayAlsoLike (carrinho): 3 cards horizontais antes CTA checkout, mensagem sutil "Que tal completar com…"

3) HERO PERSONALIZADO (Sprint 12) — 4 variantes do hero da Sessão B
- Default (cliente novo/anônimo): hero clássico já em B
- Cliente recorrente: "Bem-vinda de volta, [Nome]" sutil em corner, imagem hero de coleção que cliente nunca viu, CTA "Veja o que chegou desde sua última visita"
- Cliente VIP (LTV alto, RFM Champion): mensagem exclusiva "Acesso antecipado — coleção Outono", badge sutil "VIP", CTA "Acesso exclusivo"
- Cliente em risco (RFM At Risk): oferta retenção sutil "Sentimos sua falta — 10% off na sua próxima", não invasivo, classy
- IMPORTANTE: TODAS variantes mesma paleta/tipografia/mood — apenas CONTEÚDO muda. Cliente nem percebe que é personalizado, só sente relevância.

4) SUGESTÃO RECOMPRA NA CONTA CLIENTE (Sprint 12)
- Card na home da área logada
- Background sutil (surface diferente do bg principal)
- Header: "Está na hora de repor?" ou "Que tal um novo presente?"
- Cards horizontais 2-3 sugestões baseadas em ciclo + garantia
- Cada card: imagem produto + nome + preço + CTA "Comprar de novo"

5) GALERIA UGC NA PDP (Sprint 10) — slot já mencionado em B, aqui spec completo
- Header configurável "Como nossas clientes usam"
- Carrossel horizontal fotos UGC reais (4-6 desktop, scroll mobile)
- Cada foto: aspect ratio 1:1 ou 4:5, hover desktop mostra tags "compre o look" sobre imagem
- Click: modal foto grande + tags clicáveis (vai pra PDP do produto tagged)
- Footer: "Marque [@handle] no Instagram pra aparecer aqui"

6) SEARCH SEMÂNTICA VISUAL (Sprint 12)
- Estende busca do template
- Input com placeholder rotativo: "anel dourado para noivado", "presente para o dia das mães", "brinco para uso diário", "colar minimalista"
- Quando cliente digita, dropdown de sugestões: produtos relevantes (mini-thumb), coleções relevantes, frases populares
- Resultados: PLP normal + sutil indicador "encontrei produtos para 'sua intenção'" no topo

7) "AVISE-ME QUANDO VOLTAR" (Sprint 5 — preparar visual aqui)
- CTA secundário substituindo "Adicionar ao carrinho" quando esgotado
- Click: se logado → confirmação inline "Te avisamos por email + WhatsApp"; se anônimo → modal pedindo email
- Após inscrito: "Você está na lista. Vamos te avisar." com confetti SUTIL (1s)

Estados todos componentes: loading, erro, vazio, hover/foco, mobile vs desktop.
Modo degradado (IA OFF): chatbot mostra "FAQ + WhatsApp" sem bot, recomendações fallback "mais vendidos da categoria", hero usa default.

Microcopy default (lojista pode customizar via brand guide do template):
- Chatbot welcome: "Oi! Sou o assistente da [Nome Loja]. Posso ajudar com produtos, prazo, troca…"
- Chatbot escalation: "Vou te conectar com nosso time, ok?"
- Recomendação: "Você também pode gostar"
- Combo: "Comprados juntos com frequência"
- Sugestão recompra: "Está na hora de repor?"
- Avise-me: "Avise-me quando voltar"

Referências mood: Notion AI assist (sutil), Apple intelligence prompts (discrição classy), Mejuri (chat se existe é discreto), Catbird NYC (elegância secundária), Vrai recommendations.
NÃO referência: Drift/Intercom (chat berrante), Tidio (FAB colorido), Shopify default (genérico).

Restrições:
- Componentes IA NUNCA quebram identidade do template jewelry-v1 — coerência absoluta
- SEM badges "Powered by AI" visíveis ao cliente final
- SEM dark patterns
- Performance: chatbot widget máximo +30KB ao bundle inicial (lazy load conteúdo)

Output esperado: extensões em templates/jewelry-v1/components/, Figma com componentes adicionados ao template, handoff bundle.
```

---

## Notas para o stakeholder antes de iniciar sessão

- Esta é Sessão **D**. PRÉ-REQUISITO: Sessão **B** completa.
- Quando Claude Design perguntar:
  - **Avatar/foto pro chatbot:** símbolo discreto (logo loja em pequeno), NUNCA foto humana, NÃO emoji
  - **Animações no chatbot:** discretas (fade, slide, dots). SEM confetti, SEM bouncing.
  - **Recomendações em todas páginas:** PDP (related + bought together), carrinho (you may also like), área logada home (recompra), homepage (já em B). NÃO em checkout (manter foco na conversão).
  - **Cliente VIP precisa identificação visual gritante:** NÃO. Apenas mensagem exclusiva + oferta diferenciada. Discrição premium.

Briefing detalhado completo (referência interna): `docs/design-briefs/D-ai-components-storefront-jewelry.md`
