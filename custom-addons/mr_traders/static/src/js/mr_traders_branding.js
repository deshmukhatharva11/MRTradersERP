import { titleService } from "@web/core/browser/title_service";
import { patch } from "@web/core/utils/patch";
import { registry } from "@web/core/registry";

const localHome = "/odoo";

function isOdooHostedUrl(value) {
    try {
        const url = new URL(value, window.location.origin);
        return /(^|\.)odoo(?:\.com|\.sh)$/i.test(url.hostname);
    } catch {
        return false;
    }
}

function keepLinkLocal(link) {
    if (isOdooHostedUrl(link.href)) {
        link.href = localHome;
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.title = "MR Traders ERP";
    }
}

function neutralizeOdooLinks(root = document) {
    root.querySelectorAll("a[href]").forEach(keepLinkLocal);
}

const userMenuItems = registry.category("user_menuitems");
userMenuItems.remove("support");
userMenuItems.remove("odoo_account");

document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (link && isOdooHostedUrl(link.href)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        keepLinkLocal(link);
    }
}, true);

neutralizeOdooLinks();

patch(titleService, {
    start() {
        const service = super.start(...arguments);
        const updateBrand = () => {
            document.title = document.title.replace(/(?: - )?Odoo$/, "MR Traders ERP");
        };
        const originalSetParts = service.setParts;
        service.setParts = (...args) => {
            originalSetParts(...args);
            updateBrand();
        };
        updateBrand();
        return service;
    },
});