# Security Audit Script

Static security scan for the lojeo monorepo, intended to catch insecure patterns before they reach production. The script lives at `scripts/security-audit.sh` and is plain Bash + `grep` — zero dependencies.

## Como executar

```bash
# scan completo (apenas reporta)
./scripts/security-audit.sh

# modo CI: encerra com exit code 1 se houver descobertas críticas
./scripts/security-audit.sh --ci
```

A saída usa três níveis:

| Símbolo | Significado | Comportamento |
|---|---|---|
| `[ok]` (verde) | Padrão não encontrado | Sem ação necessária |
| `[warn]` (amarelo) | Revisão manual recomendada | Não bloqueia CI |
| `[crit]` (vermelho) | Padrão claramente inseguro | Bloqueia CI quando `--ci` está ativo |

## O que é verificado

1. **Injeção HTML não sanitizada (XSS)** — uso da prop React que insere HTML bruto no DOM. Quando aparece, confirmar que o conteúdo passou por DOMPurify ou é uma string controlada (ex: JSON-LD gerado server-side a partir de dados validados).
2. **Execução dinâmica de código (RCE)** — chamadas a interpretadores em runtime. Praticamente nunca são necessários e abrem vetores de execução remota.
3. **Interpolação em SQL bruto** — qualquer literal `sql\`...${var}...\`` é apontado como aviso. A maioria das ocorrências legítimas no projeto refere-se a colunas Drizzle (objetos com escape automático), não input do usuário; revisar caso a caso e usar `sql.placeholder()` quando o valor vier de fora.
4. **Segredos hard-coded** — chaves no formato `sk-…`, `whsec_…`, ou literais com strings de senha embutidas. Revisão obrigatória; segredos devem viver em variáveis de ambiente.
5. **CORS permissivo** — `Access-Control-Allow-Origin: *` em handlers. Aceitável apenas em endpoints públicos por design (manifestos, OG tags).
6. **Handlers mutativos sem rate-limit** — qualquer `POST/PATCH/PUT/DELETE` exportado num `route.ts` que não referencie `checkRateLimit`, `rateLimit(` ou `withRateLimit`. Hoje a base praticamente inteira cai aqui — aviso, não bloqueio, até a infraestrutura de rate-limit estar concluída.

## Quando rodar

- Localmente, antes de abrir PR de qualquer feature relevante;
- Em CI, como parte do pipeline `lint + typecheck + test`. Sugerido step:

  ```yaml
  - name: Security audit
    run: ./scripts/security-audit.sh --ci
  ```

## Como adicionar novas regras

Cada checagem é uma seção independente em `security-audit.sh`. Para adicionar uma regra nova:

1. Crie uma nova `section "N. <título>"`.
2. Use o helper `search "<regex ERE>"` (ele já aplica os excludes padrão e o conjunto de extensões).
3. Reporte com `ok` / `warn` / `crit` conforme a severidade.

Padrões cuja palavra-chave outros scanners possam sinalizar como crítica devem ser construídos em runtime concatenando substrings — veja `DSI_PATTERN`, `EVAL_PATTERN` e `FN_PATTERN` no script — para evitar falso positivo no próprio arquivo do scanner.

## Limitações conscientes

- O scanner é puramente lexical, não entende contexto. Resultados são pistas, não vereditos.
- A detecção de segredos não cobre chaves customizadas (Mercado Pago, Bling). Para isso, depender de `gitleaks` ou similar — hoje fora de escopo.
- A regra de rate-limit verifica a presença textual do helper, não se ele realmente está sendo invocado. Um lint mais profundo (AST) deve substituí-la quando o helper estiver consolidado.
