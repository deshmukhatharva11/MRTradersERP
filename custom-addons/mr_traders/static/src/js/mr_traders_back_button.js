/** @odoo-module **/

import { browser } from "@web/core/browser/browser";

// Simple script to inject a floating back button across the ERP
function injectBackButton() {
    if (document.getElementById('mr_traders_back_btn')) return;

    const btn = document.createElement("button");
    btn.id = "mr_traders_back_btn";
    btn.className = "mr_traders_global_back_btn";
    btn.innerHTML = '<i class="fa fa-arrow-left"></i>';
    btn.title = "Go Back";
    
    btn.addEventListener("click", () => {
        browser.history.back();
    });

    document.body.appendChild(btn);
}

// Inject as soon as possible
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectBackButton);
} else {
    injectBackButton();
}
