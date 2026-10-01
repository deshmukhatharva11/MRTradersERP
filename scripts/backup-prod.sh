#!/usr/bin/env sh
set -eu

compose="docker compose -f docker-compose.prod.yml --env-file .env.production"
backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
db_name="$(grep '^POSTGRES_DB=' .env.production | cut -d= -f2-)"
mkdir -p "$backup_dir"

$compose exec -T db pg_dump -U "$(grep '^POSTGRES_USER=' .env.production | cut -d= -f2-)" -d "$db_name" | gzip > "$backup_dir/${db_name}_${timestamp}.sql.gz"
$compose exec -T odoo tar -C /var/lib/odoo -czf - . > "$backup_dir/${db_name}_filestore_${timestamp}.tar.gz"

echo "Created database and filestore backups in $backup_dir"
