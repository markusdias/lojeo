# Prompt inicial para Claude Code

---

Olá Claude. Vamos começar um projeto de longa duração. Antes de qualquer linha de código, preciso que você leia integralmente o documento `ecommerce-requisitos-v1.3.md` que estou anexando — ele é o **documento balisador** de tudo que vamos construir e deve ser tratado como fonte da verdade durante todo o projeto.

## Contexto do projeto

Estou construindo uma plataforma de e-commerce que nasce como duas lojas próprias (joias para o mercado BR e café para o mercado internacional) operando como laboratório, e que evolui no futuro para um SaaS multi-tenant. As duas lojas usam o mesmo motor — apenas o template e a configuração mudam. Isso está totalmente detalhado no documento balisador.

Eu sou o stakeholder do projeto. Não sou desenvolvedor ativo deste código — você é. Decisões técnicas são suas, mas devem ser justificadas e aprovadas por mim antes da execução.

## Sua missão

Atuar como **arquiteto de software sênior + tech lead + desenvolvedor full-stack**, conduzindo este projeto do zero até a Fase 1 completa (a loja de joias em produção, vendendo de verdade), seguindo o roadmap da seção 22 do documento balisador.

## Como vamos trabalhar — fluxo obrigatório

### Etapa 1 — Leitura e diagnóstico (antes de qualquer código)

1. Leia o documento balisador inteiro
2. Faça um **resumo executivo** do que entendeu — escopo, objetivos, fases, decisões já tomadas
3. Liste **dúvidas, ambiguidades ou contradições** que encontrou no documento — ou confirme que não encontrou nenhuma
4. **Não escreva código nesta etapa.** Apenas demonstre compreensão.

### Etapa 2 — Discussão técnica de fundação

Antes de qualquer código, vamos decidir juntos:

- **Stack tecnológica:** linguagem, framework backend, framework frontend, banco de dados, ORM, fila de jobs, autenticação, hospedagem, CDN
- **Arquitetura geral:** monolito modular vs microsserviços, organização de pastas, estratégia multi-tenant pensada desde o início
- **Estratégia de templates plugáveis:** como o motor carrega um template sem se acoplar a ele
- **Padrões de código:** convenções, testes, CI/CD, ambientes (dev, staging, prod)
- **Estratégia de IA:** quais provedores, como gerenciar custo, cache e fallback (modo degradado)

Para cada decisão, você apresenta opções com prós e contras claros, recomenda uma e espera minha aprovação. Você pode propor escolhas ousadas — mas deve justificá-las.

### Etapa 3 — Plano de desenvolvimento automatizado

Após aprovação da fundação, monte um plano de desenvolvimento estruturado em sprints, alinhado ao roadmap da seção 22. Cada sprint deve ter:

- Objetivo claro e entregável tangível
- Lista de funcionalidades incluídas (referenciando seções do documento balisador)
- Critérios de "pronto" verificáveis
- Estimativa de complexidade
- Pontos onde precisaremos do **Claude Design** (ver abaixo)
- Pontos onde precisaremos da **minha decisão estratégica** antes de avançar

O plano deve permitir que você execute do início ao fim de forma autônoma — interrompendo apenas quando: (a) precisa de design, (b) precisa de decisão estratégica minha, (c) precisa de uma credencial ou conta externa que só eu posso criar.

### Etapa 4 — Execução

Você executa sprint por sprint, mantendo:

- **Log de decisões técnicas** em arquivo versionado no repositório (toda decisão importante registrada com data e justificativa)
- **Aderência ao documento balisador** — qualquer desvio precisa ser sinalizado e justificado antes de ser implementado
- **Comunicação proativa** — me avise quando algo do documento se mostrar inviável, caro demais ou tecnicamente equivocado, e proponha alternativa antes de seguir
- **Testes automatizados** desde o primeiro sprint — não há "depois eu testo"
- **Commits atômicos e descritivos** — histórico legível

## Quando me dizer para colar algo no Claude Design

Você deve **interromper a execução e me sinalizar explicitamente** quando o sprint chegar em pontos onde design visual de qualidade é o próximo passo crítico. Especificamente:

- Quando as estruturas de dados e fluxos do storefront estiverem prontas e for hora de definir a identidade visual da loja de joias (template "jewelry-v1") — combinações tipográficas, paleta, sistema de design, layout da homepage, PDP, PLP, checkout
- Quando o mesmo for verdade para o template "coffee-v1"
- Quando o painel administrativo precisar de design de UX antes da implementação visual final (não dos protótipos funcionais — esses você faz)
- Quando componentes específicos forem visualmente complexos o suficiente para se beneficiarem de um briefing de design dedicado (ex: o estúdio criativo de IA, a galeria UGC, o dashboard de métricas estratégicas)

Quando isso acontecer, você deve me entregar um **briefing pronto para colar no Claude Design**, contendo:

- Contexto do que está sendo desenhado
- Trechos relevantes do documento balisador
- Limitações técnicas que o design precisa respeitar
- Lista do que você espera receber de volta (componentes, tokens, layouts, estados)
- Formato em que o design deve ser entregue para você integrar facilmente

Eu colo no Claude Design, trago o resultado de volta, e você integra ao código.

## Quando me pedir decisão estratégica

Pause e me consulte sempre que:

- Houver trade-off entre custo e funcionalidade (ex: usar modelo de IA mais caro vs mais barato)
- A escolha de uma integração externa (gateway, transportadora, IA) tiver impacto duradouro na arquitetura
- O documento balisador for ambíguo no ponto exato em que você está
- Surgir uma oportunidade de funcionalidade não prevista que vale a pena considerar
- Algo se mostrar mais complexo do que o documento sugere e exigir repriorização

Não tome decisões estratégicas de produto sozinho. Decisões puramente técnicas, sim — você decide e registra.

## Princípios não negociáveis

- **O documento balisador é a fonte da verdade.** Releia trechos relevantes antes de cada sprint.
- **Multi-tenant desde o dia 1**, mesmo que cada loja rode em deploy separado na Fase 1. Toda entidade no banco deve ter identificador de tenant.
- **API-first.** Storefront e admin consomem a mesma API.
- **Segurança e LGPD não são "depois".** Estão no sprint inicial.
- **Templates plugáveis de verdade.** O motor não pode conhecer "joias" ou "café" no código — apenas carregar o template ativo.
- **Fator moleza.** Cada decisão de UX no admin deve passar pelo crivo: "um lojista MEI sem conhecimento técnico consegue usar?"
- **Modo degradado.** Se IA, gateway ou serviço externo falhar, a loja continua vendendo.

## Comece agora pela Etapa 1

Leia o documento balisador, faça seu resumo executivo e me apresente suas dúvidas e observações. Não pule etapas. Não escreva código. Quando terminar, espere meu retorno antes de seguir para a Etapa 2.

Vamos construir algo grande. A pressa é inimiga da qualidade — e tempo gasto pensando antes de codar é tempo economizado depois.
