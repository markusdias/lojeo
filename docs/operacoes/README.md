# Operações Lojeo

Esta pasta concentra os documentos operacionais (runbooks, planos de contingência, procedimentos de plantão e comunicação ao cliente) usados pela operação do Lojeo e pelas lojas do laboratório (jewelry-v1 e coffee-v1).

## Índice

| Documento | Tema | Quando consultar |
|---|---|---|
| [contingencia-black-friday.md](./contingencia-black-friday.md) | Plano de contingência Black Friday (D-30 ao D+7) | Última semana de novembro / pico de tráfego |

## Quando criar um novo documento operacional

Crie um runbook nesta pasta sempre que:

- Houver um evento previsível com pico de tráfego ou risco operacional (Black Friday, Cyber Monday, lançamentos sazonais, Dia das Mães, Natal)
- Surgir um procedimento recorrente envolvendo war room, comunicação ao cliente ou rollback de produção
- Existir um modo degradado pré-aprovado que precise ser documentado e treinado antes do incidente
- Houver integração externa com risco de queda (gateway, fiscal, frete) que mereça plano B escrito

## Convenções

- **Nome do arquivo:** `kebab-case.md` (ex: `contingencia-black-friday.md`, `runbook-incidente-gateway.md`)
- **Cabeçalho obrigatório:** título, contexto, responsáveis, data da última revisão
- **Listas executáveis:** sempre que possível, usar checklists `- [ ]` para que o operador marque progresso durante o evento
- **Comandos:** quando citar comando ou caminho de configuração, usar bloco de código ou inline code (ex: `/insights`, `/api/migrate`, `/settings`)
- **Camadas:** sempre declarar se o procedimento é da camada **Lojeo (sistema/admin)** ou de uma loja (template `jewelry-v1` / `coffee-v1`)

## Documentos relacionados

- `../adr/` — Architecture Decision Records (decisões técnicas estruturais)
- `../manual-lojista/` — Documentação voltada ao lojista final (não operacional interna)
- `../research/` — Pesquisas de mercado e benchmarks

## Responsáveis

- **Operação técnica:** plantão de engenharia (rotativo durante eventos críticos)
- **Operação comercial:** atendimento + estoque
- **Coordenação geral:** stakeholder do projeto

Em incidentes ativos, seguir a hierarquia de escalonamento descrita em cada runbook específico.
