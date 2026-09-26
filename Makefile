# =============================================================
# MR Traders ERP — Makefile
# Convenience shortcuts for common development tasks
# =============================================================
# Usage:  make <target>
# Requires: Docker Desktop with Compose plugin
# =============================================================

COMPOSE=docker compose
ODOO_CONTAINER=mrtraders_odoo
DB_CONTAINER=mrtraders_db
DB_NAME?=mrtraders_dev

.PHONY: help start stop restart rebuild logs shell db-shell \
        update-addon init-db drop-db reset-db build-prod

# ── Default target ────────────────────────────────────────────
help:
	@echo ""
	@echo "  MR Traders ERP — Available Commands"
	@echo "  ─────────────────────────────────────────────────"
	@echo "  make start          Start all containers (detached)"
	@echo "  make stop           Stop all containers"
	@echo "  make restart        Restart Odoo container only"
	@echo "  make rebuild        Rebuild Odoo image + restart"
	@echo "  make logs           Tail Odoo container logs"
	@echo "  make shell          Enter Odoo container (bash)"
	@echo "  make db-shell       Enter PostgreSQL container (psql)"
	@echo "  make update-addon ADDON=mr_traders   Update addon"
	@echo "  make init-db        Create & initialise DB (first run)"
	@echo "  make drop-db        Drop the development database"
	@echo "  make reset-db       Drop + re-create (full reset)"
	@echo "  make build-prod     Build production Docker image"
	@echo ""

# ── Start / Stop ──────────────────────────────────────────────
start:
	$(COMPOSE) up -d
	@echo "✅  MR Traders ERP running → http://localhost:8069"

stop:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart odoo

# ── Rebuild after source changes ──────────────────────────────
rebuild:
	$(COMPOSE) build --no-cache odoo
	$(COMPOSE) up -d --force-recreate odoo
	@echo "✅  Odoo rebuilt and restarted."

# ── Logs ──────────────────────────────────────────────────────
logs:
	$(COMPOSE) logs -f odoo

# ── Shell access ──────────────────────────────────────────────
shell:
	$(COMPOSE) exec $(ODOO_CONTAINER) bash

db-shell:
	$(COMPOSE) exec $(DB_CONTAINER) psql -U odoo -d $(DB_NAME)

# ── Database management ───────────────────────────────────────
init-db:
	$(COMPOSE) exec $(ODOO_CONTAINER) \
		python /opt/odoo/odoo/odoo-bin \
		--config=/etc/odoo/odoo.conf \
		--db_host=db \
		--db_user=odoo \
		--db_password=odoo_secret \
		-d $(DB_NAME) \
		--init=base,web,mr_traders \
		--stop-after-init
	@echo "✅  Database '$(DB_NAME)' initialised."

drop-db:
	$(COMPOSE) exec $(DB_CONTAINER) \
		psql -U odoo -c "DROP DATABASE IF EXISTS $(DB_NAME);"
	@echo "✅  Database '$(DB_NAME)' dropped."

reset-db: drop-db init-db
	@echo "✅  Database reset complete."

# ── Update custom addons ──────────────────────────────────────
update-addon:
ifndef ADDON
	$(error "Usage: make update-addon ADDON=mr_traders")
endif
	$(COMPOSE) exec $(ODOO_CONTAINER) \
		python /opt/odoo/odoo/odoo-bin \
		--config=/etc/odoo/odoo.conf \
		--db_host=db \
		--db_user=odoo \
		--db_password=odoo_secret \
		-d $(DB_NAME) \
		--update=$(ADDON) \
		--stop-after-init
	@echo "✅  Addon '$(ADDON)' updated."

# ── Production image ─────────────────────────────────────────
build-prod:
	docker build \
		--target runtime \
		--no-cache \
		-t mr-traders-erp:19.0-$(shell git rev-parse --short HEAD) \
		-t mr-traders-erp:latest \
		.
	@echo "✅  Production image built: mr-traders-erp:latest"
