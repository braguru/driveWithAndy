/* ============================================================
   Google Places API (New) — Service Layer
   ============================================================ */

const fetch = require('node-fetch');

const API_KEY   = process.env.GOOGLE_MAP_API;
const BASE_URL  = 'https://places.googleapis.com/v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const cache = new Map();

function fromCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
    return entry.data;
}

function toCache(key, data) {
    cache.set(key, { ts: Date.now(), data });
}

const FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.editorialSummary',
    'places.rating',
    'places.userRatingCount',
    'places.photos',
    'places.location',
    'places.formattedAddress',
    'places.primaryTypeDisplayName',
    'places.regularOpeningHours',
    'places.websiteUri',
].join(',');

const GHANA_BOUNDS = {
    locationRestriction: {
        rectangle: {
            low:  { latitude: 4.5,  longitude: -3.5 },
            high: { latitude: 11.5, longitude: 1.5  },
        },
    },
};

// ── Single query ──────────────────────────────────────────────

async function queryPlaces(textQuery) {
    const cacheKey = `search:${textQuery}`;
    const cached   = fromCache(cacheKey);
    if (cached) return cached;

    const res = await fetch(`${BASE_URL}/places:searchText`, {
        method: 'POST',
        headers: {
            'Content-Type':   'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({ textQuery, maxResultCount: 20, ...GHANA_BOUNDS }),
    });

    if (!res.ok) throw new Error(`Places API error: ${res.status} for "${textQuery}"`);
    const data = await res.json();
    toCache(cacheKey, data.places || []);
    return data.places || [];
}

// ── All attractions (multi-query, deduplicated) ───────────────

const SEARCH_QUERIES = [
    'top tourist attractions in Ghana',
    'historical sites and castles in Ghana',
    'national parks and wildlife in Ghana',
    'beaches and coastal attractions Ghana',
    'museums and cultural sites Ghana',
    'waterfalls and nature sites Ghana',
];

async function searchAttractions() {
    const cacheKey = 'all-attractions';
    const cached   = fromCache(cacheKey);
    if (cached) return cached;

    const results = await Promise.allSettled(SEARCH_QUERIES.map(queryPlaces));

    const seen = new Set();
    const all  = [];

    for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        for (const place of result.value) {
            if (!seen.has(place.id)) {
                seen.add(place.id);
                all.push(place);
            }
        }
    }

    // Filter: must have a photo and at least 50 reviews
    const ranked = all
        .filter(p => p.photos?.length && (p.userRatingCount || 0) >= 50)
        .sort((a, b) => {
            const ratingDiff = (b.rating || 0) - (a.rating || 0);
            if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
            return (b.userRatingCount || 0) - (a.userRatingCount || 0);
        });

    toCache(cacheKey, ranked);
    return ranked;
}

// ── Place Details ─────────────────────────────────────────────

async function getPlaceDetails(placeId) {
    const cacheKey = `detail:${placeId}`;
    const cached   = fromCache(cacheKey);
    if (cached) return cached;

    const res = await fetch(`${BASE_URL}/places/${placeId}`, {
        headers: {
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': [
                'id', 'displayName', 'editorialSummary', 'rating',
                'userRatingCount', 'photos', 'location', 'formattedAddress',
                'primaryTypeDisplayName', 'regularOpeningHours', 'websiteUri', 'reviews',
            ].join(','),
        },
    });

    if (!res.ok) throw new Error(`Places API error: ${res.status}`);
    const data = await res.json();
    toCache(cacheKey, data);
    return data;
}

// ── Photo proxy ───────────────────────────────────────────────
// Fetches photo from Google and returns the response to pipe to client

async function fetchPhoto(photoName, maxWidth = 800) {
    const url = `${BASE_URL}/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Photo fetch error: ${res.status}`);
    return res; // caller pipes res.body
}

// Returns the server-side proxy path for a photo (used in JSON responses)
function getPhotoUrl(photoName, maxWidth = 800) {
    return `/api/places/photo?name=${encodeURIComponent(photoName)}&w=${maxWidth}`;
}

module.exports = { searchAttractions, getPlaceDetails, fetchPhoto, getPhotoUrl };
