/** @odoo-module **/

// Hide website header and footer on the login page
document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.startsWith('/web/login')) {
        const header = document.querySelector('header#top');
        const footer = document.querySelector('footer');
        if (header) header.style.setProperty('display', 'none', 'important');
        if (footer) footer.style.setProperty('display', 'none', 'important');
    }
});
