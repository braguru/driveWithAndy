/* ============================================================
   Media Manifest — what the site shows, and in what order
   ============================================================ */

const crypto = require('crypto');
const blob   = require('./blob');

const MANIFEST_PATH = 'manifest.json';
const CACHE_TTL     = 60 * 1000;

const SECTIONS   = ['hero', 'gallery', 'fleet'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const VIDEO_TYPES = ['video/mp4'];

// { ts, data, etag } — etag is the version this copy represents.
let cache = null;

const MAX_ATTEMPTS = 6;

function emptyManifest() {
    return { version: 1, updatedAt: null, items: [] };
}

// Reading a public blob goes through the CDN, which can serve a version up to
// cacheControlMaxAge old. That is fine for visitors, so the public read path
// stays cheap and slightly stale.
async function load({ fresh = false } = {}) {
    if (!fresh && cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
    if (!blob.isConfigured()) return emptyManifest();

    const { data, etag } = await blob.readJson(MANIFEST_PATH);
    const manifest = data || emptyManifest();
    cache = { ts: Date.now(), data: manifest, etag };
    return manifest;
}

// Writes cannot tolerate that staleness: appending to a CDN-cached copy would
// silently drop whatever was written since. head() reads the origin, so it
// gives the true current version to compare against and to write against.
async function readAuthoritative() {
    const info = await blob.describe(MANIFEST_PATH);
    const etag = info ? info.etag : null;

    if (!etag) return { manifest: emptyManifest(), etag: null };

    // Our own last write is still the current version, so skip the CDN.
    if (cache && cache.etag === etag) return { manifest: cache.data, etag };

    const { data, etag: readEtag } = await blob.readJson(MANIFEST_PATH);
    if (readEtag !== etag) return { stale: true, etag };

    cache = { ts: Date.now(), data: data || emptyManifest(), etag };
    return { manifest: cache.data, etag };
}

async function mutate(fn) {
    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (!blob.isConfigured()) throw new Error('Blob storage is not configured');

        const { manifest, etag, stale } = await readAuthoritative();

        if (stale) {
            // The CDN has not caught up with a recent write yet. Waiting is
            // the only safe move; writing now would clobber it.
            lastError = new Error('Blob read is behind the latest write');
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
        }

        const result = await fn(manifest);
        manifest.updatedAt = new Date().toISOString();

        try {
            const written = await blob.writeJson(MANIFEST_PATH, manifest, 'public', etag);
            cache = { ts: Date.now(), data: manifest, etag: blob.strongEtag(written.etag) };
            return result;
        } catch (err) {
            if (!blob.isConflict(err)) throw err;
            lastError = err;
            cache = null;   // our copy is not what we thought it was
            await new Promise(r => setTimeout(r, 500 * attempt));
        }
    }

    throw new Error(`Could not save the media list after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
}

// ── Queries ───────────────────────────────────────────────────

function live(manifest, section) {
    return manifest.items
        .filter(i => !i.deletedAt && (!section || i.section === section))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function listSection(section) {
    return live(await load(), section);
}

// The admin panel must not be shown a CDN-cached copy: it re-reads straight
// after saving, and a stale answer looks like the edit was undone. This takes
// the origin version, which after our own write is already in memory.
async function loadCurrent() {
    if (!blob.isConfigured()) return emptyManifest();

    const { manifest, stale } = await readAuthoritative();
    if (!stale) return manifest;
    // Origin has moved on but the CDN has not caught up. Best available.
    return load({ fresh: true });
}

async function listAll() {
    const manifest = await loadCurrent();
    return {
        items:   live(manifest),
        deleted: manifest.items.filter(i => i.deletedAt),
    };
}

// ── Mutations ─────────────────────────────────────────────────

function kindFor(contentType) {
    return VIDEO_TYPES.includes(contentType) ? 'video' : 'image';
}

async function add({ section, url, pathname, contentType, caption, tag }) {
    return mutate(manifest => {
        const item = {
            id:          crypto.randomUUID(),
            section,
            url,
            pathname,
            kind:        kindFor(contentType),
            caption:     caption || '',
            tag:         tag || '',
            order:       live(manifest, section).length,
            uploadedAt:  new Date().toISOString(),
            deletedAt:   null,
        };
        manifest.items.push(item);
        return item;
    });
}

// Appends many items in a single write. The migration uses this: doing 36
// separate read-modify-writes is both slow and the exact pattern the ETag
// guard has to keep retrying against.
async function addMany(entries) {
    return mutate(manifest => {
        const added = [];
        for (const entry of entries) {
            const item = {
                id:         crypto.randomUUID(),
                section:    entry.section,
                url:        entry.url,
                pathname:   entry.pathname,
                kind:       kindFor(entry.contentType),
                caption:    entry.caption || '',
                tag:        entry.tag || '',
                // live() already counts what this loop has pushed, so it must
                // not be added to a separate running total.
                order:      live(manifest, entry.section).length,
                uploadedAt: new Date().toISOString(),
                deletedAt:  null,
            };
            manifest.items.push(item);
            added.push(item);
        }
        return added;
    });
}

async function update(id, { caption, tag }) {
    return mutate(manifest => {
        const item = manifest.items.find(i => i.id === id);
        if (!item) return null;
        if (caption !== undefined) item.caption = caption;
        if (tag !== undefined)     item.tag = tag;
        return item;
    });
}

// Soft delete. The file stays in Blob so a mistap is recoverable.
async function softDelete(id) {
    return mutate(manifest => {
        const item = manifest.items.find(i => i.id === id);
        if (!item) return null;
        item.deletedAt = new Date().toISOString();
        return item;
    });
}

async function restore(id) {
    return mutate(manifest => {
        const item = manifest.items.find(i => i.id === id);
        if (!item) return null;
        item.deletedAt = null;
        return item;
    });
}

async function reorder(section, orderedIds) {
    return mutate(manifest => {
        orderedIds.forEach((id, index) => {
            const item = manifest.items.find(i => i.id === id && i.section === section);
            if (item) item.order = index;
        });
        return live(manifest, section);
    });
}

module.exports = {
    SECTIONS, IMAGE_TYPES, VIDEO_TYPES,
    load, loadCurrent, listSection, listAll,
    add, addMany, update, softDelete, restore, reorder,
    MANIFEST_PATH, emptyManifest,
};
