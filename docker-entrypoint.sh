# =============================================================
# MR Traders ERP — Docker Entrypoint
# =============================================================
#!/bin/bash
set -e

# Wait for PostgreSQL to be ready (belt-and-suspenders beyond healthcheck)
echo "⏳  Waiting for PostgreSQL at ${HOST:-db}:${PORT:-5432}..."
until pg_isready -h "${HOST:-db}" -p "${PORT:-5432}" -U "${USER:-odoo}" > /dev/null 2>&1; do
    sleep 1
done
echo "✅  PostgreSQL is ready."

# If first argument is 'odoo', run Odoo
if [ "$1" = "odoo" ]; then
    shift
    exec python /opt/odoo/odoo/odoo-bin "$@"
fi

# Otherwise exec whatever command was given
exec "$@"
