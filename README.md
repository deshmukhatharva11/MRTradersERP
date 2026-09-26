# MR Traders ERP

**Odoo 19.0 Community Edition** — built from source for full customization and rebranding.

> ⚠️ This project runs Odoo from its **actual source code** (not the prebuilt Docker image) so you can modify, brand, and extend it freely while remaining compliant with the LGPL-3 license.

---

## Project Structure

```
mr-traders-erp/
├── odoo/                          ← Odoo 19.0 source (cloned from GitHub)
│   └── addons/                    ← Core Odoo modules
├── custom-addons/
│   └── mr_traders/                ← MR Traders ERP module (branding + features)
│       ├── __manifest__.py
│       ├── models/
│       ├── views/
│       ├── data/
│       ├── security/
│       └── static/src/scss/       ← Brand theme SCSS files
├── config/
│   └── odoo.conf                  ← Odoo configuration
├── Dockerfile                     ← Multi-stage build from source
├── docker-compose.yml             ← Odoo + PostgreSQL dev stack
├── docker-entrypoint.sh           ← Container startup script
├── .env.example                   ← Copy to .env with your secrets
├── .gitignore
├── git-setup.sh                   ← One-time Git initialization
├── Makefile                       ← Development convenience commands
└── README.md
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Docker Desktop | 24.x |
| Docker Compose plugin | v2.x (`docker compose`) |
| Git | 2.x |
| GNU Make | 3.81+ (optional but recommended) |

---

## First-Time Setup

### 1. Clone this project

```bash
git clone <YOUR_PRIVATE_REPO_URL> mr-traders-erp
cd mr-traders-erp
```

### 2. Clone Odoo 19.0 source

```bash
# Shallow clone — fast, gets only latest commit
git clone \
  --depth 1 \
  --branch 19.0 \
  --single-branch \
  https://github.com/odoo/odoo \
  odoo
```

> **Why not Docker Hub's `odoo` image?**  
> The official image bundles Odoo as an opaque binary. Cloning the source gives you full access to templates, SCSS, views, and Python code for genuine rebranding.

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and set secure passwords
```

### 4. Set up Git remotes (run once)

```bash
chmod +x git-setup.sh
# Pass your private repo URL:
./git-setup.sh git@github.com:YOUR_USERNAME/mr-traders-erp.git
```

This will:
- Set `upstream` → `https://github.com/odoo/odoo` inside `./odoo/`
- Set `origin` → your private repository
- Create and checkout the `mr-traders` branch
- Stage your project files for the initial commit

### 5. Start the development stack

```bash
make start
# — or —
docker compose up -d --build
```

### 6. Initialize the database

```bash
make init-db
# — or manually —
docker compose exec mrtraders_odoo \
  python /opt/odoo/odoo/odoo-bin \
  --config=/etc/odoo/odoo.conf \
  --db_host=db --db_user=odoo --db_password=odoo_secret \
  -d mrtraders_dev \
  --init=base,web,mr_traders \
  --stop-after-init
```

### 7. Open in browser

```
http://localhost:8069
```

Use the master password from `config/odoo.conf` (`admin_passwd`) to access the database manager.

---

## Daily Development Commands

### Start Odoo

```bash
make start
# or
docker compose up -d
```

### Stop Odoo

```bash
make stop
# or
docker compose down
```

### Rebuild after source-code changes

```bash
make rebuild
# or
docker compose build --no-cache odoo && docker compose up -d --force-recreate odoo
```

> **Tip:** During development the `odoo/` and `custom-addons/` directories are **volume-mounted**, so most Python/XML/SCSS changes take effect on the next page reload (or after restarting the Odoo service) **without a full rebuild**.

### Enter the Odoo container

```bash
make shell
# or
docker compose exec mrtraders_odoo bash
```

### Update custom addons

```bash
make update-addon ADDON=mr_traders
# or
docker compose exec mrtraders_odoo \
  python /opt/odoo/odoo/odoo-bin \
  --config=/etc/odoo/odoo.conf \
  --db_host=db --db_user=odoo --db_password=odoo_secret \
  -d mrtraders_dev \
  --update=mr_traders \
  --stop-after-init
```

### Create / Reset the development database

```bash
# Full reset (drop + re-create)
make reset-db

# Drop only
make drop-db

# Create only
make init-db
```

### Tail logs

```bash
make logs
# or
docker compose logs -f odoo
```

---

## Branding & Customization Guide

### Where to make changes

| What to change | Where |
|---|---|
| Logo & favicon | `custom-addons/mr_traders/static/src/img/` + update `__manifest__.py` |
| Login page styles | `custom-addons/mr_traders/static/src/scss/mr_traders_login.scss` |
| Backend colors/theme | `custom-addons/mr_traders/static/src/scss/mr_traders_theme.scss` |
| Company name/data | `custom-addons/mr_traders/data/res_company_data.xml` |
| Browser `<title>` | Override `web.layout` QWeb template in a new XML view file |
| Navigation bar title | `odoo/addons/web/static/src/webclient/navbar/` (direct source edit) |
| Core Odoo templates | `odoo/addons/<module>/views/*.xml` — edit directly since you own the source |

### ⚡ Enabling Odoo Developer Mode (for live edits)

Append `?debug=1` to any URL, or go to:  
`Settings → General Settings → Developer Tools → Activate Developer Mode`

### Overriding the browser title

Add this to a new XML file in `custom-addons/mr_traders/views/`:

```xml
<template id="mr_traders_web_layout" inherit_id="web.layout" name="MR Traders Layout">
    <xpath expr="//title" position="replace">
        <title><t t-esc="title"/> | MR Traders ERP</title>
    </xpath>
</template>
```

Register in `__manifest__.py` under `data`.

---

## Git Workflow

### Commit your customizations

```bash
# Stage custom addons and config changes
git add custom-addons/ config/ Dockerfile docker-compose.yml
git commit -m "feat(mr_traders): update brand colors and login page"
git push origin mr-traders
```

### Pull Odoo security patches

```bash
cd odoo
git fetch upstream
git merge upstream/19.0
# Resolve any conflicts, then:
cd ..
git add odoo
git commit -m "chore: update Odoo to latest 19.0 security patch"
```

### Branch strategy

| Branch | Purpose |
|---|---|
| `mr-traders` | Your main working branch |
| `mr-traders/feature-*` | Feature branches |
| `mr-traders/hotfix-*` | Urgent fixes |

---

## Build Production Docker Image

```bash
make build-prod
# or
docker build \
  --target runtime \
  --no-cache \
  -t mr-traders-erp:19.0 \
  -t mr-traders-erp:latest \
  .
```

### Push to client VPS

```bash
# Save and transfer
docker save mr-traders-erp:latest | gzip > mr-traders-erp.tar.gz
scp mr-traders-erp.tar.gz user@vps:/opt/mr-traders/

# On the VPS
docker load < mr-traders-erp.tar.gz
docker compose -f docker-compose.prod.yml up -d
```

---

## License & Compliance

- **Odoo Community Edition** is licensed under [LGPL-3](https://www.gnu.org/licenses/lgpl-3.0.html).
- All original Odoo copyright and license notices are **preserved** in the source code. Do not remove them.
- MR Traders custom code in `custom-addons/mr_traders/` is also licensed LGPL-3 to remain compatible.
- If you add third-party Odoo Community modules, verify their licenses individually.
- You are free to: run, study, modify, and distribute Odoo CE. You must: publish any modifications to the LGPL-licensed files if you distribute the software.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Cannot connect to PostgreSQL` | Run `make logs` — wait for DB healthcheck |
| `ModuleNotFoundError` | Rebuild image: `make rebuild` |
| Assets not updating | Restart: `docker compose restart odoo` + `Ctrl+Shift+R` |
| Port 8069 already in use | Change `ODOO_PORT` in `.env` |
| Need debug logs | Uncomment `log_level = debug` in `config/odoo.conf` |
