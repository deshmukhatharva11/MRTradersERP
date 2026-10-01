import { Component, useState } from "@odoo/owl";
import { user } from "@web/core/user";
import { registry } from "@web/core/registry";
import { useBus, useService } from "@web/core/utils/hooks";
import { patch } from "@web/core/utils/patch";
import { WebClient } from "@web/webclient/webclient";

export class MRTradersLauncher extends Component {
    static template = "mr_traders.ApplicationLauncher";

    setup() {
        this.menuService = useService("menu");
        this.currentUser = user;
        this.state = useState({
            query: "",
            visible: false,
        });
        useBus(this.env.bus, "MR_TRADERS:SHOW_LAUNCHER", () => {
            this.state.query = "";
            this.state.visible = true;
        });
    }

    get applications() {
        const query = this.state.query.trim().toLowerCase();
        return this.menuService.getApps().filter((app) => {
            return !query || app.name.toLowerCase().includes(query);
        });
    }

    onSearch(event) {
        this.state.query = event.target.value;
    }

    async openApplication(application) {
        this.state.visible = false;
        await this.menuService.selectMenu(application);
    }

    logout() {
        if (window.electronAPI && window.electronAPI.logout) {
            window.electronAPI.logout();
        } else {
            window.location.href = "/web/session/logout";
        }
    }
}

registry.category("main_components").add("MRTradersLauncher", {
    Component: MRTradersLauncher,
});

patch(WebClient.prototype, {
    _loadDefaultApp() {
        this.env.bus.trigger("MR_TRADERS:SHOW_LAUNCHER");
    },
});