# -*- coding: utf-8 -*-
# =============================================================
# MR Traders ERP — Company Branding Model Extension
# =============================================================
# Copyright (C) 2026 MR Traders
# License: LGPL-3
#
# NOTE: All Odoo copyright notices in core files are preserved.
# This file only extends (not replaces) the core res.company model.
# =============================================================
from odoo import models, fields


class ResCompany(models.Model):
    _inherit = 'res.company'

    # MR Traders extended company fields can go here in the future.
    # For now the model is extended minimally — branding is handled
    # through data records (data/res_company_data.xml) and SCSS assets.
    mr_traders_branch = fields.Char(
        string='Branch / Location',
        help='MR Traders branch or office location'
    )
