# ============================================================
# MR Traders ERP — Odoo 19.0 Community Edition
# Built from source (NOT the prebuilt odoo/odoo Docker image)
# ============================================================

# --------------- Build stage: compile Python deps -----------
FROM python:3.12-slim AS builder

WORKDIR /build

# System build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libxml2-dev \
    libxslt1-dev \
    libldap2-dev \
    libsasl2-dev \
    libssl-dev \
    libffi-dev \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    zlib1g-dev \
    node-less \
    npm \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements from the cloned Odoo source
COPY odoo/requirements.txt /build/requirements.txt
RUN pip install --upgrade pip && \
    pip install --prefix=/install -r /build/requirements.txt

# --------------- Runtime stage ---------------------------------
FROM python:3.12-slim AS runtime

LABEL maintainer="MR Traders ERP <admin@mrtraders.local>" \
      version="19.0" \
      description="MR Traders ERP — Odoo 19.0 Community Edition (source build)"

ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ODOO_RC=/etc/odoo/odoo.conf

# Runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # PostgreSQL client
    libpq5 \
    # XML/XSLT
    libxml2 \
    libxslt1.1 \
    # LDAP
    libldap-2.5-0 \
    libsasl2-2 \
    # Image processing
    libjpeg62-turbo \
    libpng16-16 \
    libfreetype6 \
    # PDF rendering (wkhtmltopdf)
    wkhtmltopdf \
    fonts-noto \
    fonts-noto-cjk \
    # Node/Less for asset compilation
    nodejs \
    npm \
    # Runtime utilities
    curl \
    git \
    gosu \
    && npm install -g less rtlcss \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

# Create odoo system user (non-root)
RUN groupadd -r odoo && useradd -r -g odoo -d /opt/odoo -s /bin/bash odoo

# Create required directories
RUN mkdir -p \
    /opt/odoo/odoo \
    /opt/odoo/custom-addons \
    /var/lib/odoo \
    /var/log/odoo \
    /etc/odoo

# Copy Odoo source (from the cloned repo in the build context)
COPY --chown=odoo:odoo odoo/ /opt/odoo/odoo/

# Copy custom addons
COPY --chown=odoo:odoo custom-addons/ /opt/odoo/custom-addons/

# Copy Odoo config
COPY --chown=odoo:odoo config/odoo.conf /etc/odoo/odoo.conf

# Set up Odoo as a proper Python package/entry point
WORKDIR /opt/odoo/odoo

# Fix permissions
RUN chown -R odoo:odoo /var/lib/odoo /var/log/odoo /etc/odoo

# Entrypoint script
COPY --chown=root:root docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8069 8071 8072

VOLUME ["/var/lib/odoo", "/opt/odoo/custom-addons"]

USER odoo

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["odoo"]
