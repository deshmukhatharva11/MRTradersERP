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
from base64 import b64encode

from odoo import api, models, fields
from odoo.tools import file_open


class ResCompany(models.Model):
    _inherit = 'res.company'

    # MR Traders extended company fields can go here in the future.
    # For now the model is extended minimally — branding is handled
    # through data records (data/res_company_data.xml) and SCSS assets.
    mr_traders_branch = fields.Char(
        string='Branch / Location',
        help='MR Traders branch or office location'
    )

    @api.model
    def _apply_mr_traders_branding(self):
        logo = b64encode(file_open('mr_traders/static/src/img/mr_traders_favicon.svg', 'rb').read())
        company = self.env.ref('base.main_company', raise_if_not_found=False)
        if company:
            company.write({
                'name': 'MR Traders',
                'website': 'https://mrtraders.pk',
                'logo': logo,
                'report_header': 'MR Traders ERP',
                'report_footer': 'Powered by CodeZilla',
            })
        assistant = self.env.ref('base.partner_root', raise_if_not_found=False)
        if assistant:
            assistant.write({
                'name': 'MR Traders ERP Assistant',
                'image_1920': logo,
            })
            messages = self.env['mail.message'].search([
                ('author_id', '=', assistant.id),
                ('body', 'ilike', 'Odoo'),
            ])
            for message in messages:
                message.body = message.body.replace('OdooBot', 'MR Traders ERP Assistant').replace(
                    'Odoo', 'MR Traders ERP'
                )
