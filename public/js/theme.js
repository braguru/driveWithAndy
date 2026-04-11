/* ============================================================
   DRIVEWITHANDY — theme.js
   Day / Night mode toggle — shared across all pages
   ============================================================ */

function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    function getTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }

    function setTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('dwa-theme', t);
        applyUI(t);
    }

    function applyUI(theme) {
        const dark = theme === 'dark';
        const icon = btn.querySelector('i');
        if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    }

    btn.addEventListener('click', () => {
        setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });

    // Sync icon and logo on page load
    applyUI(getTheme());
}

document.addEventListener('DOMContentLoaded', initTheme);
