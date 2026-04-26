# ADR 0002 — Templates plugáveis via registry

**Status:** aceito · **Data:** 2026-04-26

## Contexto

Princípio não-negociável (CLAUDE.md): "o motor não pode conter referências a 'joias' ou 'café' no código — apenas carrega o template ativo via configuração".

## Decisão

`@lojeo/engine` expõe:

```ts
registerTemplate(id: string, loader: () => Promise<TemplateConfig>): void
loadTemplate(id: string): Promise<TemplateConfig>
```

Cada template (`templates/jewelry-v1`, `templates/coffee-v1`) é um package independente que **registra a si mesmo** quando importado. App storefront faz `registerTemplate('jewelry-v1', () => jewelryV1)` em `src/template.ts` e usa `loadTemplate(process.env.TEMPLATE_ID)` em runtime.

`TemplateConfig` validado por Zod schema (`TemplateConfigSchema`) garante:
- Campos por nicho (`fields`)
- Tipografia com 1+ combos curados
- Paleta de 4 cores semânticas
- Locale + currency

## Consequências

- + Motor zero referência a nicho — passa em audit trivial (`grep -r "joia\|jewelry" packages/engine`)
- + Lojista troca template via env var sem rebuild quando mesma instância
- + Coffee-v1 (Fase 1.2) entra como **package novo** sem tocar engine
- − Templates são build-time bound ao bundle do storefront (não dinâmico em runtime para deploy diferente). Aceito pra Fase 1; revisão para SaaS na Fase 2.
