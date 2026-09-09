/* ============================================================
   Vercel Blob — Storage Layer
   ============================================================ */

const {
    put, get, head, del, list, generateClientTokenFromReadWriteToken, BlobPreconditionFailedError,
} = require('@vercel/blob');

const TOKEN = () => process.env.BLOB_READ_WRITE_TOKEN;

// Blob is optional. Without a token the site falls back to the files in
// content/, so a missing token degrades the site instead of breaking it.
function isConfigured() {
    return Boolean(TOKEN());
}

function requireToken() {
    const token = TOKEN();
    if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
    return token;
}

// ── JSON documents ────────────────────────────────────────────
// Reads return the ETag alongside the data so callers can write back
// conditionally. Blob reads can lag a write by a few seconds, so a
// read-modify-write without `ifMatch` silently loses updates.

async function readJson(pathname, access = 'public') {
    const result = await get(pathname, {
        access,
        useCache: false,
        token: requireToken(),
    });
    if (!result) return { data: null, etag: null };

    const text = await streamToString(result.stream);
    try {
        return { data: JSON.parse(text), etag: strongEtag(result.blob?.etag) };
    } catch (err) {
        throw new Error(`Corrupt JSON at ${pathname}: ${err.message}`);
    }
}

// Pass ifMatch to make the write conditional. A null ifMatch means an
// unconditional overwrite, which is only safe when nothing else can be
// writing at the same time.
// Returns the put result, whose `etag` is the authoritative new version.
async function writeJson(pathname, data, access = 'public', ifMatch = null) {
    return put(pathname, JSON.stringify(data, null, 2), {
        access,
        token: requireToken(),
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        ...(ifMatch ? { ifMatch } : {}),
    });
}

// A CDN-served response carries a weak ETag (W/"abc") while the origin
// reports the strong form ("abc"). They describe the same bytes, so compare
// and send the strong form everywhere.
function strongEtag(etag) {
    return etag ? String(etag).replace(/^W\//, '') : null;
}

function isConflict(err) {
    return err instanceof BlobPreconditionFailedError
        || /precondition/i.test(err?.message || '');
}

async function streamToString(stream) {
    // Works for both web ReadableStream and Node streams.
    if (typeof stream.getReader === 'function') {
        const reader  = stream.getReader();
        const chunks  = [];
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks).toString('utf8');
    }
    const chunks = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
}

// ── Files ─────────────────────────────────────────────────────

async function putFile(pathname, body, contentType) {
    return put(pathname, body, {
        access: 'public',
        token: requireToken(),
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
    });
}

async function remove(pathname) {
    try {
        await del(pathname, { token: requireToken() });
    } catch (err) {
        console.error(`Blob delete failed for ${pathname}:`, err.message);
    }
}

async function listPrefix(prefix) {
    const { blobs } = await list({ token: requireToken(), prefix, limit: 1000 });
    return blobs;
}

// Confirms a client upload actually landed, and returns the authoritative
// URL. The browser is never trusted to report where a file ended up.
// head() takes a pathname or a URL; we pass the pathname the token was
// minted for. A miss and a genuine error look the same to the caller, so the
// reason is logged rather than swallowed.
async function describe(pathname) {
    try {
        const info = await head(pathname, { token: requireToken() });
        return info ? { ...info, etag: strongEtag(info.etag) } : null;
    } catch (err) {
        console.error(`Blob head failed for ${pathname}:`, err.message);
        return null;
    }
}

// ── Client upload tokens ──────────────────────────────────────
// Lets the browser upload straight to Blob. Necessary because Vercel caps
// serverless request bodies at 4.5MB and a phone video is far bigger.

async function createUploadToken({ pathname, contentTypes, maxBytes }) {
    return generateClientTokenFromReadWriteToken({
        token: requireToken(),
        pathname,
        allowedContentTypes: contentTypes,
        maximumSizeInBytes: maxBytes,
        addRandomSuffix: false,
        allowOverwrite: false,
        validUntil: Date.now() + 30 * 60 * 1000, // 30 min to finish a big upload
    });
}

module.exports = {
    isConfigured, readJson, writeJson, putFile, remove, listPrefix, describe, createUploadToken,
    isConflict, strongEtag,
};
