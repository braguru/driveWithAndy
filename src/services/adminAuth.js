/* ============================================================
   Admin Auth — emailed one-time code, signed session cookie
   ============================================================ */

const crypto = require('crypto');
const blob   = require('./blob');

const RATE_PATH     = 'auth/rate.json';
const CODE_TTL      = 10 * 60 * 1000;      // code valid for 10 minutes
const SESSION_TTL   = 7 * 24 * 60 * 60;    // cookie lives 7 days (seconds)
const MAX_ATTEMPTS  = 3;
const MAX_REQUESTS  = 5;                   // code requests allowed per hour
const REQUEST_WINDOW = 60 * 60 * 1000;
const COOKIE_NAME   = 'dwa_admin';

function secret() {
    const value = process.env.ADMIN_SESSION_SECRET;
    if (!value) throw new Error('ADMIN_SESSION_SECRET is not set');
    return value;
}

function adminEmail() {
    return (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}

function isConfigured() {
    return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_SESSION_SECRET && blob.isConfigured());
}

function normalise(email) {
    return String(email || '').trim().toLowerCase();
}

// Constant-time compare that tolerates different lengths.
function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

function hashCode(code) {
    return crypto.createHmac('sha256', secret()).update(String(code)).digest('hex');
}

// ── One-time codes ────────────────────────────────────────────
// Serverless functions share no memory between requests, so pending codes are
// kept in the Blob store. Only an HMAC of the code is stored, keyed by
// ADMIN_SESSION_SECRET, so a record is useless to anyone who reads it. The
// store has to be public for media URLs to work, and a rejected private write
// would lock everyone out, so public it is.
const RECORD_ACCESS = 'public';

// Each code goes to its own path. Reads of a public blob are served by the
// CDN and can be up to a minute stale, so reusing one path would mean a code
// requested moments after a previous one could be checked against the old
// record. A path that has never been read cannot be a cache hit.
function codePath(handle) {
    return `auth/codes/${handle}.json`;
}

async function readJsonSafely(path) {
    try {
        const { data } = await blob.readJson(path, RECORD_ACCESS);
        return data;
    } catch (err) {
        console.error(`Auth record read failed for ${path}:`, err.message);
        return null;
    }
}

async function sweepExpiredCodes() {
    try {
        const cutoff = Date.now() - CODE_TTL;
        const stale  = (await blob.listPrefix('auth/codes/'))
            .filter(b => new Date(b.uploadedAt).getTime() < cutoff);

        for (const b of stale) await blob.remove(b.pathname);
    } catch (err) {
        // Housekeeping only. Never block a sign-in on it.
        console.error('Could not sweep expired codes:', err.message);
    }
}

async function requestCode(email, sendMail) {
    // Wrong email gets the same answer as the right one. The page must not
    // reveal who the admin is. Nothing is recorded, because only real sends
    // count towards the limit.
    if (normalise(email) !== adminEmail()) return { sent: false, rateLimited: false };

    const now    = Date.now();
    const rate   = (await readJsonSafely(RATE_PATH)) || { requests: [] };
    const recent = (rate.requests || []).filter(ts => now - ts < REQUEST_WINDOW);

    // Caps how often Andy's inbox can be mailed. Counting only actual sends
    // means a stranger hitting this endpoint cannot lock him out.
    if (recent.length >= MAX_REQUESTS) return { sent: false, rateLimited: true };

    recent.push(now);

    // A code that is never used would otherwise sit in the store forever.
    await sweepExpiredCodes();

    const handle = crypto.randomUUID();
    const code   = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

    await blob.writeJson(codePath(handle), {
        codeHash:  hashCode(code),
        expiresAt: now + CODE_TTL,
        attempts:  0,
    }, RECORD_ACCESS);

    await blob.writeJson(RATE_PATH, { requests: recent }, RECORD_ACCESS);

    await sendMail(code);
    return { sent: true, rateLimited: false, handle };
}

async function verifyCode(email, code, handle) {
    if (normalise(email) !== adminEmail()) return { ok: false, reason: 'invalid' };
    if (!handle || !/^[0-9a-f-]{36}$/i.test(handle)) return { ok: false, reason: 'expired' };

    const record = await readJsonSafely(codePath(handle));
    if (!record || !record.codeHash)     return { ok: false, reason: 'expired' };
    if (Date.now() > record.expiresAt)   return { ok: false, reason: 'expired' };
    if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };

    if (!safeEqual(hashCode(code), record.codeHash)) {
        await blob.writeJson(codePath(handle), {
            ...record, attempts: record.attempts + 1,
        }, RECORD_ACCESS);
        return { ok: false, reason: 'invalid' };
    }

    // Burn the code so it cannot be replayed.
    await blob.remove(codePath(handle));
    return { ok: true, token: createSession(adminEmail()) };
}

// ── Sessions ──────────────────────────────────────────────────
// Stateless: the cookie carries its own expiry and signature, so nothing
// needs storing. Rotating ADMIN_SESSION_SECRET invalidates every session.

function createSession(email) {
    const payload = Buffer.from(JSON.stringify({
        email,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
    })).toString('base64url');

    const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}

function verifySession(token) {
    if (!token || typeof token !== 'string') return null;

    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;

    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    if (!safeEqual(sig, expected)) return null;

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!data.exp || Math.floor(Date.now() / 1000) > data.exp) return null;
        if (normalise(data.email) !== adminEmail()) return null;
        return data;
    } catch {
        return null;
    }
}

// ── Cookies ───────────────────────────────────────────────────

function readCookie(req) {
    const header = req.headers.cookie;
    if (!header) return null;
    for (const part of header.split(';')) {
        const [name, ...rest] = part.trim().split('=');
        if (name === COOKIE_NAME) return decodeURIComponent(rest.join('='));
    }
    return null;
}

function setCookie(res, token) {
    const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${SESSION_TTL}`);
}

function clearCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Gate for every write route. Protecting the admin HTML would be theatre;
// these endpoints are what actually change the site.
function requireAdmin(req, res, next) {
    if (!isConfigured()) {
        return res.status(503).json({ error: 'Admin is not configured on this deployment' });
    }
    const session = verifySession(readCookie(req));
    if (!session) return res.status(401).json({ error: 'Not signed in' });
    req.admin = session;
    next();
}

module.exports = {
    isConfigured, requestCode, verifyCode,
    createSession, verifySession,
    readCookie, setCookie, clearCookie, requireAdmin,
    COOKIE_NAME, MAX_ATTEMPTS,
};
