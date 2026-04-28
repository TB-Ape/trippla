# Backup & Restore

## Backups

Automated daily backups run at 03:00 via the `backup` Docker service.

- Location: `${HDD_PATH}/trippla/backups/`
- Retention: 7 days (older files pruned automatically)
- Format: gzipped pg_dump (`trippla_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`)

## Restore Procedure

1. Stop the app to prevent writes during restore:
   ```bash
   docker compose stop app
   ```

2. Drop and recreate the database:
   ```bash
   docker compose exec db psql -U trippla -c "DROP DATABASE trippla;"
   docker compose exec db psql -U trippla -c "CREATE DATABASE trippla;"
   ```

3. Restore from the chosen backup file:
   ```bash
   gunzip -c /path/to/trippla_backup_YYYY-MM-DD.sql.gz \
     | docker compose exec -T db psql -U trippla -d trippla
   ```

4. Restart the app:
   ```bash
   docker compose start app
   ```

5. Verify the restore:
   ```bash
   curl https://trippla.de/api/health
   ```
