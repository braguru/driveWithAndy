const express = require('express');
const fs      = require('fs');
const path    = require('path');
const router  = express.Router();

const CONTENT_DIR = path.join(__dirname, '../../content');
const IMAGE_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

// GET /api/images/:folder  — lists images in content/<folder>
router.get('/images/:folder', (req, res) => {
    const folder = req.params.folder;
    const dir    = path.join(CONTENT_DIR, folder);

    // Prevent path traversal
    if (!dir.startsWith(CONTENT_DIR)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    fs.readdir(dir, (err, files) => {
        if (err) return res.status(404).json({ error: 'Folder not found', folder });

        const images = files
            .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
            .map(f => `content/${folder}/${f}`);

        res.json(images);
    });
});

module.exports = router;
