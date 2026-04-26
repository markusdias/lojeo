# Deploy — EasyPanel

## Estado provisionado em 2026-04-26

Painel EasyPanel: `https://31.97.174.116/` (login: `markusmgdias@gmail.com`)
Project: `apps`

| Serviço | Tipo | Status |
|---|---|---|
| `lojeo-postgres` | Postgres 16 + pgvector | enabled |
| `trigger-postgres` | Postgres 16 (dedicado Trigger.dev) | enabled |
| `trigger-redis` | Redis 7 (dedicado Trigger.dev) | enabled |
| `lojeo-trigger` | App Trigger.dev v4 self-host | **stopped** (placeholder — setup completo no Sprint 1) |
| `lojeo-admin` | App Next.js admin | deploying |
| `lojeo-storefront` | App Next.js storefront | deploying |

## URLs

| App | Default EasyPanel | Custom |
|---|---|---|
| Admin | `https://apps-lojeo-admin.m9axtw.easypanel.host` | — |
| Storefront | `https://apps-lojeo-storefront.m9axtw.easypanel.host` | `https://joias.lojeo.com` (primary) |
| Trigger.dev | `https://apps-lojeo-trigger.m9axtw.easypanel.host` | — |

## DNS pendente

`joias.lojeo.com` precisa CNAME / A apontando para `31.97.174.116`. Enquanto não resolver, usar URL default EasyPanel. Let's Encrypt vai emitir cert automaticamente quando DNS propagar.

## Repositório

`https://github.com/markusdias/lojeo` — atualmente **público** (zero secrets reais commitados, só `.env.example`). EasyPanel usa `updateSourceGit` (clone HTTPS) sem GitHub App.

**TODO Fase 1.2:** instalar EasyPanel GitHub App + tornar repo privado novamente. Endpoint `services.app.updateSourceGithub` exige GitHub App connection.

## Builds

Source: Git `https://github.com/markusdias/lojeo.git` ref `main`. Build: Dockerfile (multi-stage `node:20-alpine` + pnpm + standalone Next.js).

```
apps/admin/Dockerfile        → service lojeo-admin
apps/storefront/Dockerfile   → service lojeo-storefront
```

## Banco de dados

`lojeo-postgres` (image `pgvector/pgvector:pg16`):
- Host interno: `lojeo-postgres:5432`
- Database: `apps`
- User: `postgres`
- Password: `Lj-pg-2026-strong-pwd!` (rotacionar antes de produção real)

Após primeiro deploy do admin, rodar migrations:

```bash
# Conectar via shell do EasyPanel ou exec no container
DATABASE_URL='postgres://postgres:Lj-pg-2026-strong-pwd!@lojeo-postgres:5432/apps?sslmode=disable' \
  pnpm db:migrate

# Seed inicial (cria tenant joias-lab + admin@lojeo.dev)
DATABASE_URL='...' pnpm db:seed

# Ou expor o banco e rodar de fora — EasyPanel UI tem "Expose"
```

## Secrets a rotacionar antes de tráfego real

| Variável | Onde | Geração |
|---|---|---|
| `AUTH_SECRET` | env admin | `openssl rand -base64 48` |
| Senha Postgres | EasyPanel > lojeo-postgres > Credentials | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | env admin (futuro) | console.anthropic.com |
| `R2_*` | env admin (futuro) | dash.cloudflare.com → R2 |
| `RESEND_API_KEY` | env admin (futuro) | resend.com |
| `AUTH_GOOGLE_ID/SECRET` | env admin (futuro) | console.cloud.google.com |

## Trigger.dev — pendente setup completo

Imagem `ghcr.io/triggerdotdev/trigger.dev:v4-prod-webapp` retorna 404 (não publicada publicamente em GHCR). Trigger.dev v4 self-host completo precisa multi-container (webapp + supervisor + electric) + clone do repo.

Decisão CTO: deixar `lojeo-trigger` parado até Sprint 1 ter primeiro job real (otimização de imagem no upload, Sec 16 do doc balisador). Postgres + Redis dedicados ficam reservados.

Caminho recomendado quando subir:
1. Clonar `triggerdotdev/trigger.dev` no servidor
2. Usar `docker-compose.yml` oficial do `hosting/docker/`
3. Importar como service tipo `compose` no EasyPanel

## API EasyPanel — quick reference

```bash
TOKEN="<rotacionar>"; HOST="https://31.97.174.116"
# Listar projetos
curl -k -H "Authorization: Bearer $TOKEN" "$HOST/api/trpc/projects.listProjects"
# Inspecionar serviço
curl -k -H "Authorization: Bearer $TOKEN" \
  "$HOST/api/trpc/services.app.inspectService?input=%7B%22json%22%3A%7B%22projectName%22%3A%22apps%22%2C%22serviceName%22%3A%22lojeo-admin%22%7D%7D"
# Deploy
curl -k -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST "$HOST/api/trpc/services.app.deployService" \
  -d '{"json":{"projectName":"apps","serviceName":"lojeo-admin"}}'
```

Procedures descobertas (extraídas do bundle JS do painel): `services.app.{createService,deployService,destroyService,inspectService,startService,stopService,restartService,updateBuild,updateDeploy,updateEnv,updateRedirects,updateResources,updateScripts,updateSourceDockerfile,updateSourceGit,updateSourceGithub,updateSourceImage,refreshDeployToken}` · `services.postgres.*` (sem deploy direto, usa enableService) · `services.redis.*` · `domains.{createDomain,deleteDomain,listDomains,setPrimaryDomain,updateDomain}`.

## Tokens deploy webhook (auto-deploy)

Cada service tem URL própria pra disparar deploy via push hook (já obtida via `inspectService`):

- admin: `http://31.97.174.116:3000/api/deploy/cb91175f06c89cafa6688a5cb04abebea0e8ac4278a7ad58`
- storefront: `http://31.97.174.116:3000/api/deploy/0c8f82c08479d1617ab79ed5cdce96af301f9a4425438cbd`
- trigger: `http://31.97.174.116:3000/api/deploy/25d17d0dc6f650916a467c8cb49d5d4ec1be41330abfcd4a`

Adicionar como GitHub webhook em `https://github.com/markusdias/lojeo/settings/hooks` (`push` event, `application/json`) pra auto-deploy em merge na `main`.
