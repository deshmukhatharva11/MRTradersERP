#!/usr/bin/env bash
# =============================================================
# MR Traders ERP — Git Setup Script
# Run this ONCE after initial project creation.
# =============================================================
# Usage:
#   chmod +x git-setup.sh
#   ./git-setup.sh git@github.com:YOUR_USERNAME/mr-traders-erp.git
# =============================================================
set -e

PRIVATE_REMOTE="${1:-}"
ODOO_UPSTREAM="https://github.com/odoo/odoo"
ODOO_BRANCH="19.0"
WORK_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== MR Traders ERP — Git Setup ==="
echo "Working directory: $WORK_DIR"
echo ""

# ── Step 1: Clone Odoo 19.0 source into ./odoo ────────────────
if [ -d "$WORK_DIR/odoo/.git" ]; then
    echo "✅  Odoo source already cloned at ./odoo — skipping clone."
else
    echo "⬇️   Cloning Odoo $ODOO_BRANCH (shallow clone for speed)..."
    git clone \
        --depth 1 \
        --branch "$ODOO_BRANCH" \
        --single-branch \
        "$ODOO_UPSTREAM" \
        "$WORK_DIR/odoo"
    echo "✅  Odoo source cloned."
fi

# ── Step 2: Init the project repo ────────────────────────────
cd "$WORK_DIR"

if [ -d "$WORK_DIR/.git" ]; then
    echo "✅  Git repo already initialized at project root — skipping."
else
    echo "🔧  Initializing Git repository..."
    git init
    echo "✅  Git initialized."
fi

# ── Step 3: Set Odoo upstream remote on the odoo/ subdir ─────
cd "$WORK_DIR/odoo"
if git remote | grep -q "^upstream$"; then
    echo "✅  'upstream' remote already set in ./odoo."
else
    git remote add upstream "$ODOO_UPSTREAM"
    echo "✅  Added 'upstream' remote → $ODOO_UPSTREAM"
fi
cd "$WORK_DIR"

# ── Step 4: Create & switch to mr-traders branch ─────────────
if git branch --list | grep -q "mr-traders"; then
    git checkout mr-traders
    echo "✅  Switched to existing 'mr-traders' branch."
else
    git checkout -b mr-traders
    echo "✅  Created and switched to branch 'mr-traders'."
fi

# ── Step 5: Set private origin remote ────────────────────────
if [ -z "$PRIVATE_REMOTE" ]; then
    echo ""
    echo "⚠️  No private remote URL supplied."
    echo "    Run later: git remote add origin <YOUR_REPO_URL>"
    echo "    Then push: git push -u origin mr-traders"
else
    if git remote | grep -q "^origin$"; then
        echo "✅  'origin' remote already set."
    else
        git remote add origin "$PRIVATE_REMOTE"
        echo "✅  Added 'origin' remote → $PRIVATE_REMOTE"
    fi
fi

# ── Step 6: Initial commit ────────────────────────────────────
echo ""
echo "📦  Staging project files..."

# Add everything except Odoo source (tracked separately)
git add \
    Dockerfile \
    docker-compose.yml \
    docker-entrypoint.sh \
    .env.example \
    .gitignore \
    config/ \
    custom-addons/ \
    README.md \
    git-setup.sh \
    Makefile

git status

read -rp "Commit these files now? [y/N] " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    git commit -m "chore: initial MR Traders ERP project scaffold (Odoo 19.0 source)"
    echo "✅  Initial commit created."
    if [ -n "$PRIVATE_REMOTE" ]; then
        read -rp "Push to origin/mr-traders? [y/N] " dopush
        if [[ "$dopush" =~ ^[Yy]$ ]]; then
            git push -u origin mr-traders
            echo "✅  Pushed to origin."
        fi
    fi
fi

echo ""
echo "=== Git Setup Complete ==="
echo ""
echo "Remote summary:"
echo "  ./odoo upstream → $ODOO_UPSTREAM (Odoo 19.0 source)"
[ -n "$PRIVATE_REMOTE" ] && echo "  project origin  → $PRIVATE_REMOTE"
echo ""
echo "Branch: mr-traders"
echo ""
echo "To get future Odoo security patches:"
echo "  cd odoo && git fetch upstream && git merge upstream/19.0"
