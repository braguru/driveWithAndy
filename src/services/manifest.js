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

let cache = null; // { ts, data }

function emptyManifest() {
    return { version: 1, updatedAt: null, items: [] };
}

async function load({ fresh = false } = {}) {
    if (!fresh && cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
    if (!blob.isConfigured()) return emptyManifest();

    const data = (await blob.readJson(MANIFEST_PATH)) || emptyManifest();
    cache = { ts: Date.now(), data };
    return data;
}

async function save(manifest) {
    manifest.updatedAt = new Date().toISOString();
    await blob.writeJson(MANIFEST_PATH, manifest);
    cache = { ts: Date.now(), data: manifest };
    return manifest;
}

// Every write is read-modify-write on the whole document. Safe here because
// there is exactly one admin; revisit if that ever stops being true.
async function mutate(fn) {
    const manifest = await load({ fresh: true });
    const result   = await fn(manifest);
    await save(manifest);
    return result;
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

async function listAll() {
    const manifest = await load({ fresh: true });
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
    load, save, listSection, listAll,
    add, update, softDelete, restore, reorder,
    MANIFEST_PATH, emptyManifest,
};
