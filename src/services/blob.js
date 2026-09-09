/* ============================================================
   Vercel Blob — Storage Layer
   ============================================================ */

const { put, get, head, generateClientTokenFromReadWriteToken } = require('@vercel/blob');

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
// Blob caches aggressively at the CDN, so reads pass useCache:false and
// writes set a short max-age. Otherwise an edit would take a month to show.

async function readJson(pathname, access = 'public') {
    const result = await get(pathname, {
        access,
        useCache: false,
        token: requireToken(),
    });
    if (!result) return null;

    const text = await streamToString(result.stream);
    try {
        return JSON.parse(text);
    } catch (err) {
        throw new Error(`Corrupt JSON at ${pathname}: ${err.message}`);
    }
}

async function writeJson(pathname, data, access = 'public') {
    return put(pathname, JSON.stringify(data, null, 2), {
        access,
        token: requireToken(),
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
    });
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

// Confirms a client upload actually landed, and returns the authoritative
// URL. The browser is never trusted to report where a file ended up.
// head() takes a pathname or a URL; we pass the pathname the token was
// minted for. A miss and a genuine error look the same to the caller, so the
// reason is logged rather than swallowed.
async function describe(pathname) {
    try {
        return await head(pathname, { token: requireToken() });
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
    isConfigured, readJson, writeJson, putFile, describe, createUploadToken,
};
