/* ============================================================
   One-off migration: content/ files into Vercel Blob
   Run once, from a machine with BLOB_READ_WRITE_TOKEN set:
       node scripts/migrate-media.js          # dry run
       node scripts/migrate-media.js --commit # actually upload
   Safe to run more than once; files already in the manifest are skipped.
   ============================================================ */

const path_ = require('path');
// Matches server.js: prefer .env.local (written by `vercel env pull`).
require('dotenv').config({ path: [
    path_.join(__dirname, '../.env.local'),
    path_.join(__dirname, '../.env'),
] });

const fs   = require('fs');
const path = require('path');

const blob     = require('../src/services/blob');
const manifest = require('../src/services/manifest');

const CONTENT_DIR = path.join(__dirname, '../content');
const COMMIT      = process.argv.includes('--commit');

// content/ folder -> site section
const FOLDERS = {
    expeditions: 'hero',
    gallery:     'gallery',
    fleet:       'fleet',
};

const CONTENT_TYPES = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
    '.mp4': 'video/mp4',  '.mov': 'video/quicktime',
};

// Captions that used to live in public/js/app.js, keyed by filename. Carried
// across so the gallery keeps its labels after the move.
const GALLERY_META = {
    'WhatsApp Image 2026-04-04 at 11.26.47 AM (1).jpeg': { tag: 'Cape Coast',    label: 'Andy at Cape Coast Castle' },
    'WhatsApp Image 2026-04-04 at 11.26.47 AM.jpeg':     { tag: 'Heritage',      label: 'Cape Coast Castle' },
    'WhatsApp Image 2026-04-04 at 11.26.46 AM.jpeg':     { tag: 'Group Tour',    label: 'Group Expedition' },
    'WhatsApp Image 2026-04-04 at 11.26.46 AM (1).jpeg': { tag: 'On Location',   label: 'With Guests, Central Region' },
    'WhatsApp Image 2026-04-04 at 11.26.34 AM.jpeg':     { tag: 'Safari',        label: 'Safari Excursion' },
    'WhatsApp Image 2026-04-04 at 11.26.34 AM (1).jpeg': { tag: 'Wildlife',      label: 'Wildlife Encounter' },
    'WhatsApp Image 2026-04-04 at 11.26.33 AM.jpeg':     { tag: 'Family',        label: 'Family Tour' },
    'WhatsApp Image 2026-04-04 at 11.26.33 AM (1).jpeg': { tag: 'Highlights',    label: 'Tour Moments' },
    'WhatsApp Image 2026-04-04 at 11.26.32 AM.jpeg':     { tag: 'Accra',         label: 'Heritage Walk, Accra' },
    'WhatsApp Image 2026-04-04 at 11.26.29 AM.jpeg':     { tag: 'Volta Region',  label: 'Volta River Cruise' },
    'WhatsApp Image 2026-04-04 at 11.26.29 AM (1).jpeg': { tag: 'Central Coast', label: 'Coastal Drive' },
    'WhatsApp Image 2026-04-04 at 11.26.22 AM.jpeg':     { tag: 'The Fleet',     label: "Andy's Premium 4x4" },
    'WhatsApp Image 2026-04-04 at 2.14.39 PM.jpeg':      { tag: 'On the Road',   label: 'On the Road with Andy' },
    'WhatsApp Image 2026-04-04 at 2.14.39 PM (1).jpeg':  { tag: 'Expedition',    label: 'Expedition Moment' },
    'WhatsApp Image 2026-04-04 at 2.14.39 PM (2).jpeg':  { tag: 'Experience',    label: 'Tour Experience' },
    'WhatsApp Image 2026-04-04 at 2.14.40 PM.jpeg':      { tag: 'Adventure',     label: 'Ghana Adventure' },
};

function slugify(name) {
    return name.toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'file';
}

function collect() {
    const files = [];

    for (const [folder, section] of Object.entries(FOLDERS)) {
        const dir = path.join(CONTENT_DIR, folder);
        let names;
        try {
            names = fs.readdirSync(dir).sort();
        } catch {
            console.log(`  skipping ${folder}: not found`);
            continue;
        }

        names.forEach(name => {
            const ext         = path.extname(name).toLowerCase();
            const contentType = CONTENT_TYPES[ext];
            if (!contentType) return;

            const meta = GALLERY_META[name] || {};
            files.push({
                section,
                localPath:   path.join(dir, name),
                filename:    name,
                contentType,
                caption:     meta.label || '',
                tag:         meta.tag   || '',
                bytes:       fs.statSync(path.join(dir, name)).size,
            });
        });
    }

    return files;
}

async function main() {
    if (!blob.isConfigured()) {
        console.error('BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull` first.');
        process.exit(1);
    }

    const files   = collect();
    const current = await manifest.load({ fresh: true });
    const already = new Set(current.items.map(i => i.pathname));

    const todo = files.filter(f =>
        !already.has(`media/${f.section}/${slugify(f.filename)}${path.extname(f.filename).toLowerCase()}`));

    const totalMb = (files.reduce((sum, f) => sum + f.bytes, 0) / 1024 / 1024).toFixed(1);
    console.log(`Found ${files.length} files (${totalMb}MB). ${todo.length} still to upload.\n`);

    if (!COMMIT) {
        todo.forEach(f => console.log(`  would upload  ${f.section.padEnd(8)} ${f.filename}`));
        console.log('\nDry run. Re-run with --commit to upload.');
        return;
    }

    // Upload everything first, then record the whole batch in one write.
    // Recording each file separately means 36 read-modify-write cycles on the
    // same document, and Blob reads can trail a write by a few seconds, so
    // that pattern loses entries.
    const uploaded = [];

    for (const file of todo) {
        const ext      = path.extname(file.filename).toLowerCase();
        const pathname = `media/${file.section}/${slugify(file.filename)}${ext}`;

        process.stdout.write(`  uploading ${file.filename} ... `);
        const result = await blob.putFile(pathname, fs.readFileSync(file.localPath), file.contentType);

        uploaded.push({
            section:     file.section,
            url:         result.url,
            pathname,
            contentType: file.contentType,
            caption:     file.caption,
            tag:         file.tag,
        });
        console.log('done');
    }

    process.stdout.write(`\nRecording ${uploaded.length} files in the manifest ... `);
    await manifest.addMany(uploaded);
    console.log('done');

    const check = await manifest.load({ fresh: true });
    console.log(`\nMigrated ${uploaded.length} files. Manifest now holds ${check.items.length}.`);
    if (check.items.length !== uploaded.length + already.size) {
        console.error('WARNING: manifest count does not match. Re-run to reconcile.');
        process.exitCode = 1;
    }
}

main().catch(err => {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
});
