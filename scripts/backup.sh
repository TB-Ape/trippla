#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="trippla_backup_${DATE}.sql.gz"
KEEP_DAYS=7

: "${PGPASSWORD:?PGPASSWORD must be set}"

echo "[backup] Starting at $(date)"

pg_dump \
  -h "$POSTGRES_HOST" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[backup] Saved: ${FILENAME} ($(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

find "$BACKUP_DIR" -name "trippla_backup_*.sql.gz" -mtime +$((KEEP_DAYS - 1)) -delete
echo "[backup] Pruned backups older than ${KEEP_DAYS} days"

echo "[backup] Done. Current backups:"
ls -lh "$BACKUP_DIR"/trippla_backup_*.sql.gz 2>/dev/null || echo "(none)"
