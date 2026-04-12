/* ============================================================
   DRIVEWITHANDY — theme.js
   Day / Night mode toggle — shared across all pages
   ============================================================ */

function initTheme() {
    const btns = document.querySelectorAll('.theme-toggle');
    if (btns.length === 0) return;

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
        btns.forEach(btn => {
            const icon  = btn.querySelector('i');
            const label = btn.querySelector('.theme-label');
            if (icon)  icon.className    = dark ? 'fas fa-sun'    : 'fas fa-moon';
            if (label) label.textContent = dark ? 'Light Mode'    : 'Dark Mode';
        });
    }

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(getTheme() === 'dark' ? 'light' : 'dark');
        });
    });

    // Sync icon and logo on page load
    applyUI(getTheme());
}

document.addEventListener('DOMContentLoaded', initTheme);
