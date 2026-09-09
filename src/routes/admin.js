/* ============================================================
   Admin Routes — /api/admin
   Every route that changes anything sits behind requireAdmin.
   ============================================================ */

const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();

const auth     = require('../services/adminAuth');
const blob     = require('../services/blob');
const manifest = require('../services/manifest');
const { sendAdminCode } = require('../services/mailer');

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'file';
}

function extensionFor(contentType) {
    return {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
        'image/avif': 'avif', 'video/mp4': 'mp4',
    }[contentType];
}

// ── Session ───────────────────────────────────────────────────

router.get('/session', (req, res) => {
    if (!auth.isConfigured()) {
        return res.json({ signedIn: false, configured: false });
    }
    const session = auth.verifySession(auth.readCookie(req));
    res.json({ signedIn: Boolean(session), configured: true });
});

router.post('/request-code', async (req, res) => {
    if (!auth.isConfigured()) {
        return res.status(503).json({ error: 'Admin is not configured on this deployment' });
    }

    try {
        const { rateLimited } = await auth.requestCode(
            req.body?.email,
            code => sendAdminCode(process.env.ADMIN_EMAIL, code),
        );

        if (rateLimited) {
            return res.status(429).json({ error: 'Too many codes requested. Try again later.' });
        }
        // Deliberately the same answer whether or not the email matched.
        res.json({ sent: true });
    } catch (err) {
        console.error('Admin code request failed:', err.message);
        res.status(500).json({ error: 'Could not send the code' });
    }
});

router.post('/verify-code', async (req, res) => {
    if (!auth.isConfigured()) {
        return res.status(503).json({ error: 'Admin is not configured on this deployment' });
    }

    try {
        const result = await auth.verifyCode(req.body?.email, req.body?.code);
        if (!result.ok) {
            const message = {
                expired: 'That code has expired. Request a new one.',
                locked:  'Too many wrong attempts. Request a new code.',
                invalid: 'That code is not right.',
            }[result.reason] || 'That code is not right.';
            return res.status(401).json({ error: message });
        }

        auth.setCookie(res, result.token);
        res.json({ signedIn: true });
    } catch (err) {
        console.error('Admin verify failed:', err.message);
        res.status(500).json({ error: 'Could not verify the code' });
    }
});

router.post('/logout', (req, res) => {
    auth.clearCookie(res);
    res.json({ signedIn: false });
});

// ── Media ─────────────────────────────────────────────────────

router.get('/media', auth.requireAdmin, async (req, res) => {
    try {
        res.json(await manifest.listAll());
    } catch (err) {
        console.error('Admin media list failed:', err.message);
        res.status(500).json({ error: 'Could not load media' });
    }
});

// Mints a short-lived token so the browser can upload straight to Blob.
// Needed because Vercel caps serverless request bodies at 4.5MB.
router.post('/blob-token', auth.requireAdmin, async (req, res) => {
    const { section, filename, contentType } = req.body || {};

    if (!manifest.SECTIONS.includes(section)) {
        return res.status(400).json({ error: 'Unknown section' });
    }

    const allowed = [...manifest.IMAGE_TYPES, ...manifest.VIDEO_TYPES];
    if (!allowed.includes(contentType)) {
        return res.status(400).json({ error: `Unsupported file type: ${contentType}` });
    }

    const isVideo  = manifest.VIDEO_TYPES.includes(contentType);
    const pathname = `media/${section}/${crypto.randomUUID().slice(0, 8)}-${slugify(filename || '')}.${extensionFor(contentType)}`;

    try {
        const token = await blob.createUploadToken({
            pathname,
            contentTypes: [contentType],
            maxBytes:     isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
        });
        res.json({ token, pathname });
    } catch (err) {
        console.error('Upload token failed:', err.message);
        res.status(500).json({ error: 'Could not start the upload' });
    }
});

// Called by the browser once the file has landed in Blob. This is what
// records it, rather than Vercel's onUploadCompleted webhook, which cannot
// reach localhost and would make the feature untestable outside production.
router.post('/media', auth.requireAdmin, async (req, res) => {
    const { section, pathname, caption, tag } = req.body || {};

    if (!manifest.SECTIONS.includes(section)) {
        return res.status(400).json({ error: 'Unknown section' });
    }
    if (!pathname || !String(pathname).startsWith(`media/${section}/`)) {
        return res.status(400).json({ error: 'Bad upload path' });
    }

    try {
        // Ask Blob what is actually there rather than believing the browser.
        const file = await blob.describe(pathname);
        if (!file) return res.status(404).json({ error: 'That upload did not arrive' });

        const item = await manifest.add({
            section,
            url:         file.url,
            pathname,
            contentType: file.contentType,
            caption:     String(caption || '').trim().slice(0, 200),
            tag:         String(tag || '').trim().slice(0, 40),
        });
        res.status(201).json(item);
    } catch (err) {
        console.error('Media record failed:', err.message);
        res.status(500).json({ error: 'Uploaded, but could not be saved to the site' });
    }
});

router.patch('/media/:id', auth.requireAdmin, async (req, res) => {
    const { caption, tag } = req.body || {};

    try {
        const item = await manifest.update(req.params.id, {
            caption: caption === undefined ? undefined : String(caption).trim().slice(0, 200),
            tag:     tag === undefined ? undefined : String(tag).trim().slice(0, 40),
        });
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        console.error('Media update failed:', err.message);
        res.status(500).json({ error: 'Could not save the change' });
    }
});

// Soft delete: hides it from the site but keeps the file, so a mistap is
// recoverable through the restore route below.
router.delete('/media/:id', auth.requireAdmin, async (req, res) => {
    try {
        const item = await manifest.softDelete(req.params.id);
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        console.error('Media delete failed:', err.message);
        res.status(500).json({ error: 'Could not remove it' });
    }
});

router.post('/media/:id/restore', auth.requireAdmin, async (req, res) => {
    try {
        const item = await manifest.restore(req.params.id);
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        console.error('Media restore failed:', err.message);
        res.status(500).json({ error: 'Could not restore it' });
    }
});

router.post('/reorder', auth.requireAdmin, async (req, res) => {
    const { section, ids } = req.body || {};

    if (!manifest.SECTIONS.includes(section)) {
        return res.status(400).json({ error: 'Unknown section' });
    }
    if (!Array.isArray(ids)) {
        return res.status(400).json({ error: 'ids must be an array' });
    }

    try {
        res.json({ items: await manifest.reorder(section, ids) });
    } catch (err) {
        console.error('Reorder failed:', err.message);
        res.status(500).json({ error: 'Could not save the new order' });
    }
});

module.exports = router;
