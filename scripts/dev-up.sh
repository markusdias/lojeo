#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Subindo Postgres (pgvector)..."
docker compose up -d postgres

echo "→ Aguardando Postgres ficar saudável..."
until docker compose exec -T postgres pg_isready -U lojeo -d lojeo > /dev/null 2>&1; do
  sleep 1
done

echo "→ Postgres pronto em postgres://lojeo:lojeo@localhost:5432/lojeo"
echo "→ Para subir MinIO opcional: docker compose --profile storage up -d minio"
