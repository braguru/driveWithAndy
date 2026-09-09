/* ============================================================
   Media Routes — /api/media  (public read)
   ============================================================ */

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const router   = express.Router();
const manifest = require('../services/manifest');

const CONTENT_DIR = path.join(__dirname, '../../content');
const MEDIA_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.mp4', '.mov']);
const VIDEO_EXTS  = new Set(['.mp4', '.mov']);

// Fallback for when Blob is unconfigured or unreachable. Serves whatever is
// still committed under content/, so the site degrades instead of going blank.
function fromContentDir(section) {
    const dir = path.join(CONTENT_DIR, section === 'hero' ? 'expeditions' : section);
    if (!dir.startsWith(CONTENT_DIR)) return [];

    let files;
    try {
        files = fs.readdirSync(dir);
    } catch {
        return [];
    }

    return files
        .filter(f => MEDIA_EXTS.has(path.extname(f).toLowerCase()))
        .sort()
        .map((f, index) => ({
            id:      `content-${section}-${index}`,
            section,
            url:     `content/${path.basename(dir)}/${f}`,
            kind:    VIDEO_EXTS.has(path.extname(f).toLowerCase()) ? 'video' : 'image',
            caption: '',
            tag:     '',
            order:   index,
            source:  'content',
        }));
}

// GET /api/media/:section  — hero, gallery or fleet
router.get('/media/:section', async (req, res) => {
    const { section } = req.params;
    if (!manifest.SECTIONS.includes(section)) {
        return res.status(404).json({ error: 'Unknown section', section });
    }

    try {
        const items = await manifest.listSection(section);
        if (items.length) return res.json({ source: 'blob', items });
    } catch (err) {
        console.error(`Manifest read failed for ${section}:`, err.message);
    }

    res.json({ source: 'content', items: fromContentDir(section) });
});

module.exports = router;
module.exports.fromContentDir = fromContentDir;
