# Estratégia de Backup — Lojeo

Backup automático diário do Postgres com retenção 30 dias e cópia
opcional em storage off-site (Cloudflare R2).

## Componentes

| Componente | Propósito |
|---|---|
| `scripts/backup-db.sh` | Script bash que faz `pg_dump | gzip` + upload R2 + limpeza retention |
| Cron diário 03:00 BRT | Disparo automático na VPS EasyPanel |
| Cloudflare R2 (opcional) | Storage off-site, redundância |
| `apps/admin/src/app/api/migrate/route.ts` | Re-aplicar schema idempotente em ambiente novo |

## Fluxo

```
03:00 BRT diário
   ↓
pg_dump $DATABASE_URL → gzip -9 → ./backups/backup-YYYY-MM-DD-HHMMSS.sql.gz
   ↓
[opcional] rclone copy → R2://lojeo-backups/lojeo/db/
   ↓
find ./backups -mtime +30 -delete
```

## Setup inicial na VPS EasyPanel

```bash
# 1. Clone do repo na VPS
cd /opt && git clone https://github.com/markusdias/lojeo.git
cd lojeo

# 2. Garantir pg_dump compatível (≥16)
apt-get install -y postgresql-client-16 gzip

# 3. Criar .env com DATABASE_URL produção
echo "DATABASE_URL=postgres://postgres:Lj-pg-2026-strong-pwd!@31.97.174.116:5433/apps" > .env
chmod 600 .env

# 4. Testar manualmente
./scripts/backup-db.sh

# 5. Configurar cron
crontab -e
# Adicionar:
0 6 * * * cd /opt/lojeo && DATABASE_URL=$(grep DATABASE_URL .env | cut -d= -f2-) /opt/lojeo/scripts/backup-db.sh >> /var/log/lojeo-backup.log 2>&1

# 6. (opcional) R2 off-site
apt-get install -y rclone
rclone config  # criar remote 'lojeo-r2' tipo S3 com endpoint Cloudflare
echo "R2_BUCKET=lojeo-backups" >> .env
```

## Restore

### Para banco vazio
```bash
gunzip -c backups/backup-YYYY-MM-DD-HHMMSS.sql.gz | psql $DATABASE_URL
```

### Para banco existente (rollback)
```bash
# Drop schemas relevantes ANTES (cuidado!)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Aplicar dump
gunzip -c backups/backup-YYYY-MM-DD-HHMMSS.sql.gz | psql $DATABASE_URL

# Re-aplicar migrations idempotentes (opcional, schema já está no dump)
curl -X POST https://apps-lojeo-admin.m9axtw.easypanel.host/api/migrate \
  -H "Authorization: Bearer $MIGRATE_TOKEN"
```

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `DATABASE_URL` | — | Connection string Postgres (obrigatório) |
| `BACKUP_DIR` | `./backups` | Diretório local para dumps |
| `BACKUP_RETENTION` | `30` | Dias de retenção local |
| `R2_BUCKET` | — | Bucket R2 (se setado, faz upload) |
| `R2_PREFIX` | `lojeo/db/` | Prefixo dentro do bucket |

## Monitoramento

- Cron loga em `/var/log/lojeo-backup.log`
- Verificar tamanho do último dump: `ls -lh /opt/lojeo/backups/ | tail -3`
- Alarme se `find /opt/lojeo/backups/ -mmin -1500 | wc -l == 0` (sem backup nas últimas 25h)

## Roadmap

- [x] Script `backup-db.sh` com pg_dump + gzip + retenção
- [x] Documentação operacional (este doc)
- [ ] Cron na VPS de produção (depende de acesso SSH EasyPanel)
- [ ] Testar restore mensal automatizado em DB sandbox
- [ ] Alarme via webhook se backup ausente >25h
- [ ] Migrar para Neon nativo (Point-in-Time Recovery) quando migrar do EasyPanel

## Custo estimado

- VPS storage local: ~10 MB/dump × 30 dias = 300 MB (negligível)
- R2 storage: 300 MB × $0.015/GB-mês ≈ $0.005/mês (zero)
- R2 egress: zero (free tier 10GB/mês)
- **Total: <$0.01/mês**
