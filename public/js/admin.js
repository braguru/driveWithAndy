/* ============================================================
   Media Manager — admin page behaviour
   ============================================================ */

// The upload SDK is loaded from a CDN, because the site has no bundler and
// the published browser build cannot be used straight from node_modules.
// It is imported lazily inside doUpload so that a CDN outage costs only
// uploading; signing in and editing captions still work.
const BLOB_CLIENT = 'https://esm.sh/@vercel/blob@2.8.0/client';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MULTIPART_ABOVE = 10 * 1024 * 1024;

const SECTION_NAMES = {
    hero:    'hero slider',
    gallery: 'gallery',
    fleet:   'fleet',
};

let activeSection = 'hero';
let chosenFile    = null;

const $ = id => document.getElementById(id);

// ── Small helpers ─────────────────────────────────────────────

function toast(message, isError = false) {
    const el = $('toast');
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 3500);
}

function showError(el, message) {
    if (!message) { el.hidden = true; return; }
    el.textContent = message;
    el.hidden = false;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

async function api(path, options = {}) {
    const res = await fetch(`/api/admin${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
}

// ── Sign in ───────────────────────────────────────────────────

function initAuth() {
    const emailForm = $('email-form');
    const codeForm  = $('code-form');
    const errorEl   = $('auth-error');

    emailForm.addEventListener('submit', async e => {
        e.preventDefault();
        showError(errorEl, null);
        const button = emailForm.querySelector('button');
        button.disabled = true;
        button.textContent = 'Sending...';

        try {
            await api('/request-code', {
                method: 'POST',
                body: JSON.stringify({ email: $('admin-email').value.trim() }),
            });
            emailForm.hidden = true;
            codeForm.hidden  = false;
            $('admin-code').focus();
        } catch (err) {
            showError(errorEl, err.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Send code';
        }
    });

    codeForm.addEventListener('submit', async e => {
        e.preventDefault();
        showError(errorEl, null);
        const button = codeForm.querySelector('button');
        button.disabled = true;

        try {
            await api('/verify-code', {
                method: 'POST',
                body: JSON.stringify({
                    email: $('admin-email').value.trim(),
                    code:  $('admin-code').value.trim(),
                }),
            });
            await showManager();
        } catch (err) {
            showError(errorEl, err.message);
            $('admin-code').value = '';
        } finally {
            button.disabled = false;
        }
    });

    $('back-to-email').addEventListener('click', () => {
        codeForm.hidden  = true;
        emailForm.hidden = false;
        showError(errorEl, null);
    });
}

// ── Upload ────────────────────────────────────────────────────

function initUpload() {
    const input = $('file-input');

    input.addEventListener('change', () => {
        chosenFile = input.files[0] || null;
        const label = $('file-label');
        $('file-label-text').textContent = chosenFile ? chosenFile.name : 'Choose a photo or video';
        label.classList.toggle('has-file', Boolean(chosenFile));
        $('upload-btn').disabled = !chosenFile;
        showError($('upload-error'), null);
    });

    $('upload-btn').addEventListener('click', doUpload);
}

async function doUpload() {
    if (!chosenFile) return;

    const errorEl  = $('upload-error');
    const button   = $('upload-btn');
    const progress = $('upload-progress');
    const bar      = $('upload-progress-bar');

    showError(errorEl, null);

    const isVideo = chosenFile.type.startsWith('video/');
    const limit   = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (chosenFile.size > limit) {
        return showError(errorEl,
            `That file is ${(chosenFile.size / 1024 / 1024).toFixed(0)}MB. The limit is ${limit / 1024 / 1024}MB.`);
    }

    button.disabled = true;
    button.textContent = 'Uploading...';
    progress.hidden = false;
    bar.style.width = '0%';

    try {
        let put;
        try {
            ({ put } = await import(BLOB_CLIENT));
        } catch {
            throw new Error('Could not load the uploader. Check your connection and try again.');
        }

        // The server mints a short-lived token. The file then goes straight to
        // Blob, because Vercel caps request bodies to functions at 4.5MB.
        const { token, pathname } = await api('/blob-token', {
            method: 'POST',
            body: JSON.stringify({
                section:     activeSection,
                filename:    chosenFile.name,
                contentType: chosenFile.type,
            }),
        });

        await put(pathname, chosenFile, {
            access:      'public',
            token,
            contentType: chosenFile.type,
            multipart:   chosenFile.size > MULTIPART_ABOVE,
            onUploadProgress: ({ percentage }) => { bar.style.width = `${percentage}%`; },
        });

        // The server confirms the file with Blob before recording it, so a
        // forged URL from here would not be trusted.
        await api('/media', {
            method: 'POST',
            body: JSON.stringify({
                section: activeSection,
                pathname,
                caption: $('upload-caption').value,
                tag:     $('upload-tag').value,
            }),
        });

        $('file-input').value = '';
        $('upload-caption').value = '';
        $('upload-tag').value = '';
        $('file-label-text').textContent = 'Choose a photo or video';
        $('file-label').classList.remove('has-file');
        chosenFile = null;

        toast('Uploaded');
        await loadMedia();
    } catch (err) {
        showError(errorEl, err.message);
    } finally {
        button.disabled = true;
        button.textContent = 'Upload';
        progress.hidden = true;
    }
}

// ── Listing ───────────────────────────────────────────────────

function cardHTML(item, deleted = false) {
    const preview = item.kind === 'video'
        ? `<video src="${escapeHtml(item.url)}" muted playsinline preload="metadata"></video>`
        : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption || 'Site media')}" loading="lazy">`;

    return `
    <article class="admin-card" data-id="${item.id}" ${deleted ? '' : 'draggable="true"'}>
        <div class="admin-card-media">
            ${preview}
            ${deleted ? '' : '<span class="admin-drag-handle" title="Drag to reorder"><i class="fas fa-grip-lines"></i></span>'}
            ${item.kind === 'video' ? '<span class="admin-kind-badge">Video</span>' : ''}
        </div>
        <div class="admin-card-body">
            ${deleted ? '' : `
            <input type="text" class="js-caption" value="${escapeHtml(item.caption || '')}" placeholder="Caption" maxlength="200">
            <input type="text" class="js-tag" value="${escapeHtml(item.tag || '')}" placeholder="Tag" maxlength="40">`}
            <div class="admin-card-actions">
                <span class="admin-save-state"></span>
                ${deleted
                    ? '<button class="admin-icon-btn restore js-restore">Restore</button>'
                    : '<button class="admin-icon-btn js-delete">Remove</button>'}
            </div>
        </div>
    </article>`;
}

async function loadMedia() {
    const list    = $('media-list');
    const deleted = $('deleted-list');

    let data;
    try {
        data = await api('/media');
    } catch (err) {
        return toast(err.message, true);
    }

    const items = data.items.filter(i => i.section === activeSection);
    const gone  = data.deleted.filter(i => i.section === activeSection);

    list.innerHTML = items.map(i => cardHTML(i)).join('');
    $('media-empty').hidden = items.length > 0;
    $('reorder-hint').hidden = items.length < 2;

    deleted.innerHTML = gone.map(i => cardHTML(i, true)).join('');
    $('deleted-wrap').hidden = gone.length === 0;
}

// ── Editing, deleting, reordering ─────────────────────────────

function initListActions() {
    const list = $('media-list');

    // Save a caption or tag when the field loses focus.
    list.addEventListener('focusout', async e => {
        const field = e.target.closest('.js-caption, .js-tag');
        if (!field) return;

        const card  = field.closest('.admin-card');
        const state = card.querySelector('.admin-save-state');
        state.textContent = 'Saving...';

        try {
            await api(`/media/${card.dataset.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    caption: card.querySelector('.js-caption').value,
                    tag:     card.querySelector('.js-tag').value,
                }),
            });
            state.textContent = 'Saved';
            setTimeout(() => { state.textContent = ''; }, 2000);
        } catch (err) {
            state.textContent = '';
            toast(err.message, true);
        }
    });

    list.addEventListener('click', async e => {
        const button = e.target.closest('.js-delete');
        if (!button) return;

        const card = button.closest('.admin-card');
        if (!confirm('Remove this from the site? You can restore it afterwards.')) return;

        try {
            await api(`/media/${card.dataset.id}`, { method: 'DELETE' });
            toast('Removed');
            await loadMedia();
        } catch (err) {
            toast(err.message, true);
        }
    });

    $('deleted-list').addEventListener('click', async e => {
        const button = e.target.closest('.js-restore');
        if (!button) return;

        const card = button.closest('.admin-card');
        try {
            await api(`/media/${card.dataset.id}/restore`, { method: 'POST' });
            toast('Restored');
            await loadMedia();
        } catch (err) {
            toast(err.message, true);
        }
    });

    initDragReorder(list);
}

function initDragReorder(list) {
    let dragged = null;

    list.addEventListener('dragstart', e => {
        dragged = e.target.closest('.admin-card');
        if (!dragged) return;
        dragged.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    list.addEventListener('dragend', async () => {
        if (!dragged) return;
        dragged.classList.remove('dragging');
        list.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
        dragged = null;
        await saveOrder(list);
    });

    list.addEventListener('dragover', e => {
        e.preventDefault();
        const target = e.target.closest('.admin-card');
        if (!target || !dragged || target === dragged) return;

        const cards = [...list.querySelectorAll('.admin-card')];
        const after = cards.indexOf(target) > cards.indexOf(dragged);
        target.parentNode.insertBefore(dragged, after ? target.nextSibling : target);
    });
}

async function saveOrder(list) {
    const ids = [...list.querySelectorAll('.admin-card')].map(c => c.dataset.id);
    try {
        await api('/reorder', {
            method: 'POST',
            body: JSON.stringify({ section: activeSection, ids }),
        });
        toast('Order saved');
    } catch (err) {
        toast(err.message, true);
        await loadMedia();
    }
}

// ── Tabs and startup ──────────────────────────────────────────

function initTabs() {
    $('admin-tabs').addEventListener('click', async e => {
        const tab = e.target.closest('.admin-tab');
        if (!tab || tab.dataset.section === activeSection) return;

        activeSection = tab.dataset.section;
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t === tab));
        $('upload-section-name').textContent = SECTION_NAMES[activeSection];
        await loadMedia();
    });
}

async function showManager() {
    $('admin-auth').hidden = true;
    $('admin-main').hidden = false;
    await loadMedia();
}

async function start() {
    initAuth();
    initTabs();
    initUpload();
    initListActions();

    $('logout-btn').addEventListener('click', async () => {
        await api('/logout', { method: 'POST' });
        location.reload();
    });

    try {
        const { signedIn, configured } = await api('/session');
        if (!configured) {
            $('admin-auth').hidden = false;
            showError($('auth-error'),
                'Admin is not configured on this deployment. ADMIN_EMAIL, ADMIN_SESSION_SECRET and BLOB_READ_WRITE_TOKEN need setting.');
            $('email-form').hidden = true;
            return;
        }
        if (signedIn) return showManager();
    } catch {
        // Fall through to the sign-in form.
    }

    $('admin-auth').hidden = false;
}

start();
