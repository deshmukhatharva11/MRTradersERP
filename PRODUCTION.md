# Production Deployment

This deployment is separate from the local development stack. It builds the immutable `runtime` image, keeps PostgreSQL and Odoo private, and exposes only Caddy on ports 80 and 443.

## Prerequisites

- Docker Engine and Compose v2
- A DNS A/AAAA record for the production domain pointing to the host
- Ports 80 and 443 available for automatic HTTPS
- A secure password for PostgreSQL
- A secure Odoo master password

## First deployment

1. Copy `.env.production.example` to `.env.production`.
2. Replace every `CHANGE_ME` value and set `ERP_DOMAIN` to the real DNS name.
3. Verify `.env.production` is not committed.
4. Build and start the production stack:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Caddy obtains and renews the TLS certificate automatically after DNS resolves.

## Verification

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f odoo
```

Open `https://$ERP_DOMAIN`. The Odoo and PostgreSQL ports are intentionally not published to the host.

## Backups

Run `scripts/backup-prod.sh` from the repository root on a schedule, then copy the generated database and filestore archives to separate storage. Test restoration before relying on the backups.

## Updates

Build a new runtime image and recreate only after a database backup:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production build --pull odoo
docker compose -f docker-compose.prod.yml --env-file .env.production up -d odoo
```

The production stack does not mount the source tree or custom addons read-write.
