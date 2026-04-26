# Design Briefs — Claude Design

Briefings prontos para serem levados ao **Claude Design** (Anthropic Labs, lançado em abril/2026, powered by Claude Opus 4.7). Cada briefing é autocontido — copie e cole no Claude Design.

## Fluxo de trabalho

1. **Claude Code** (este repositório) gera os briefings detalhados
2. **Stakeholder** revisa, ajusta se necessário, leva ao **Claude Design**
3. **Claude Design** produz mockups + design tokens + Figma + handoff bundle
4. **Stakeholder** traz handoff bundle de volta para Claude Code
5. **Claude Code** implementa usando o bundle entregue

## Distinção crítica de camadas

NUNCA confundir Lojeo (sistema/produto SaaS) com templates (jewelry-v1, coffee-v1). São identidades visuais diferentes para públicos diferentes.

| Briefing | Camada | Quem vê |
|---|---|---|
| **A — Lojeo system identity** | Lojeo (sistema/admin/marca SaaS) | Lojistas (todos os nichos) |
| **B — Template jewelry-v1** | Template (storefront da loja de joias BR) | Clientes finais da loja de joias |
| **C — AI features no admin Lojeo** | Lojeo (extensão do admin) | Lojistas (todos os nichos) |
| **D — AI components no storefront jewelry-v1** | Template (extensão do storefront) | Clientes finais da loja de joias |
| **E — Template coffee-v1** | Template (storefront da loja de café) — Fase 1.2 | Clientes finais da loja de café |

## Ordem de entrega ao Claude Design

| Ordem | Briefing | Sprint que bloqueia |
|---|---|---|
| 1 | A — Lojeo system identity | Sprint 0 (parcial), Sprint 5 (total) |
| 2 | B — Template jewelry-v1 | Sprint 2 |
| 3 | C — AI features admin Lojeo | Sprint 8, 10, 11 |
| 4 | D — AI components storefront jewelry-v1 | Sprint 9, 12 |
| 5 | E — Template coffee-v1 (Fase 1.2) | Sprint 14 |

A e B são paralelos (podem ser feitos no mesmo período). C depende de A entregue. D depende de B entregue.

## Após receber handoff do Claude Design

Para cada handoff:
1. Salvar em `templates/<nome>/` (templates) ou `packages/ui/` (Lojeo system)
2. Validar tokens compatíveis com Tailwind v4
3. Validar componentes Figma → especificações
4. Documentar no DECISION_LOG.md qualquer decisão de design recebida que afete arquitetura

---

## Estrutura dos arquivos

Cada checkpoint tem 2 arquivos:

| Arquivo | Uso |
|---|---|
| `<X>-<nome>.md` | Briefing detalhado completo — referência interna pra Claude Code e stakeholder |
| `<X>-<nome>.compact.md` | Versão pronta pra **copy-paste** no Claude Design (3 campos: blurb / assets / notes) |

**Sempre usar a versão `.compact.md` ao operar Claude Design.** O detalhado é referência caso precise responder perguntas de Claude Design.

## Formato do Claude Design (descoberto via screenshot)

Claude Design pede:
1. **Company name and blurb** — descrição curta do produto/contexto
2. **Resources** (opcional) — code GitHub, .fig file, fontes/logos/assets
3. **Any other notes?** — paleta, mood, voice, restrições em parágrafo

Sessions iterativas: stakeholder pode refinar via chat após primeira geração.

## Recomendação de ordem de execução

**Paralelo (mesma janela de tempo):**
- Sessão A (Lojeo system) ← faz primeiro pra ter design system base
- Sessão B (Template jewelry-v1) ← faz em paralelo (independente)

**Depois (sequencial, dependem das anteriores):**
- Sessão C (IA admin) ← depende de A
- Sessão D (IA storefront jewelry) ← depende de B

**Fase 1.2 (futuro):**
- Sessão E (Template coffee-v1)
