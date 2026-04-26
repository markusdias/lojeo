#!/usr/bin/env bash
# ============================================================================
# Lojeo — Backup do banco Postgres (Neon ou EasyPanel)
#
# Uso:
#   DATABASE_URL=postgres://... ./scripts/backup-db.sh
#   ./scripts/backup-db.sh                   # lê DATABASE_URL do .env
#
# Variáveis opcionais:
#   BACKUP_DIR        — diretório local (default ./backups)
#   BACKUP_RETENTION  — dias de retenção (default 30)
#   R2_BUCKET         — se setado, faz upload via rclone para R2 (configurar
#                       remote 'lojeo-r2' antes via `rclone config`)
#   R2_PREFIX         — prefixo S3 (default lojeo/db/)
#
# Cron exemplo (diário 03:00 BRT):
#   0 6 * * * cd /opt/lojeo && DATABASE_URL=$(grep DATABASE_URL .env | cut -d= -f2-) \
#             /opt/lojeo/scripts/backup-db.sh >> /var/log/lojeo-backup.log 2>&1
#
# Restore:
#   gunzip -c backup-2026-04-26-030000.sql.gz | psql $DATABASE_URL
# ============================================================================

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    DATABASE_URL=$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup-db] ERROR: DATABASE_URL não definido (env nem .env)" >&2
  exit 2
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION="${BACKUP_RETENTION:-30}"
R2_PREFIX="${R2_PREFIX:-lojeo/db/}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +'%Y-%m-%d-%H%M%S')
FILENAME="backup-${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "[backup-db] $(date -u +'%Y-%m-%d %H:%M:%S UTC') — Iniciando dump"

# pg_dump com formato custom para restore granular + gzip pra compactar
pg_dump \
  --no-owner \
  --no-privileges \
  --format=plain \
  --quote-all-identifiers \
  "$DATABASE_URL" \
  | gzip -9 > "$FILEPATH"

SIZE=$(du -h "$FILEPATH" | cut -f1)
echo "[backup-db] Dump local OK: ${FILEPATH} (${SIZE})"

# Upload R2 (opcional, requer rclone configurado)
if [ -n "${R2_BUCKET:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    REMOTE_PATH="lojeo-r2:${R2_BUCKET}/${R2_PREFIX}${FILENAME}"
    echo "[backup-db] Upload R2: ${REMOTE_PATH}"
    rclone copy "$FILEPATH" "lojeo-r2:${R2_BUCKET}/${R2_PREFIX}" --progress
    echo "[backup-db] Upload OK"
  else
    echo "[backup-db] WARN: R2_BUCKET setado mas rclone não instalado — skip upload"
  fi
fi

# Limpa backups locais > retention dias
echo "[backup-db] Limpando backups > ${BACKUP_RETENTION} dias em ${BACKUP_DIR}"
find "$BACKUP_DIR" -name 'backup-*.sql.gz' -type f -mtime +"$BACKUP_RETENTION" -delete 2>/dev/null || true
REMAINING=$(find "$BACKUP_DIR" -name 'backup-*.sql.gz' -type f | wc -l | tr -d ' ')
echo "[backup-db] Backups locais: ${REMAINING}"

echo "[backup-db] Concluído"
