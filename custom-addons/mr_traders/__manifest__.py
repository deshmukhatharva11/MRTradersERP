# -*- coding: utf-8 -*-
# =============================================================
# MR Traders ERP — Custom Addon Manifest
# =============================================================
# Copyright (C) 2026 MR Traders
# License: LGPL-3 (see LICENSE file)
# =============================================================
{
    'name': 'MR Traders ERP',
    'version': '19.0.1.0.0',
    'category': 'Customizations',
    'summary': 'MR Traders-specific branding, configurations, and features',
    'description': """
MR Traders ERP Core Module
============================
This module provides:
- MR Traders branding (logo, favicon, colors)
- Custom login page
- MR Traders-specific configurations
- Base for all MR Traders ERP features

NOTE: Core branding overrides live here rather than in Odoo core,
keeping MR Traders customizations isolated and upgrade-safe.
    """,
    'author': 'MR Traders',
    'website': 'https://mrtraders.pk',
    'license': 'LGPL-3',

    'depends': [
        'base',
        'web',
        'mail',
    ],

    'data': [
        # Security
        'security/ir.model.access.csv',
        # Views
        'views/res_company_views.xml',
        # Data
        'data/res_company_data.xml',
    ],

    'assets': {
        'web.assets_backend': [
            'mr_traders/static/src/scss/mr_traders_theme.scss',
        ],
        'web.assets_frontend': [
            'mr_traders/static/src/scss/mr_traders_login.scss',
        ],
    },

    'images': ['static/description/icon.png'],
    'installable': True,
    'auto_install': False,
    'application': True,
}
