/* ============================================================
   Places Routes — /api/places
   ============================================================ */

const express = require('express');
const router  = express.Router();
const places  = require('../services/places');

// GET /api/places/config
router.get('/config', (req, res) => {
    res.json({ mapsKey: process.env.GOOGLE_MAP_API });
});

// GET /api/places/photo?name=...&w=800
// Proxies Google photo through server (keeps API key hidden, fixes CORS)
router.get('/photo', async (req, res) => {
    const { name, w = 800 } = req.query;
    if (!name) return res.status(400).json({ error: 'Missing photo name' });

    try {
        const photoRes = await places.fetchPhoto(name, Number(w));
        res.set('Content-Type', photoRes.headers.get('content-type') || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400'); // cache 24h in browser
        photoRes.body.pipe(res);
    } catch (err) {
        console.error('Photo proxy error:', err.message);
        res.status(500).json({ error: 'Failed to fetch photo' });
    }
});

// GET /api/places/attractions?offset=0&limit=6&q=&type=
// Returns a paginated list of Ghana tourist attractions.
// `q` and `type` filter the full cached list, not just the current page,
// so the frontend search covers every destination we know about.
router.get('/attractions', async (req, res) => {
    const offset = parseInt(req.query.offset) || 0;
    const limit  = parseInt(req.query.limit)  || 6;
    const query  = (req.query.q || '').trim().toLowerCase();
    const type   = (req.query.type || '').trim();

    try {
        const all = await places.searchAttractions();

        const formatted = all.map(p => ({
            id:          p.id,
            name:        p.displayName?.text || 'Unknown',
            summary:     p.editorialSummary?.text || null,
            rating:      p.rating || null,
            ratingCount: p.userRatingCount || null,
            address:     p.formattedAddress || null,
            type:        p.primaryTypeDisplayName?.text || null,
            location:    p.location || null,
            website:     p.websiteUri || null,
            photo:       p.photos?.[0] ? places.getPhotoUrl(p.photos[0].name, 800) : null,
            openNow:     p.regularOpeningHours?.openNow ?? null,
        }));

        // Every type we know about, so the filter chips never depend on
        // which page happens to be loaded.
        const types = [...new Set(formatted.map(p => p.type).filter(Boolean))].sort();

        const matches = formatted.filter(p => {
            if (type && p.type !== type) return false;
            if (!query) return true;
            return [p.name, p.type, p.address]
                .some(field => field && field.toLowerCase().includes(query));
        });

        res.json({
            total:   matches.length,
            hasMore: offset + limit < matches.length,
            types,
            items:   matches.slice(offset, offset + limit),
        });
    } catch (err) {
        console.error('Places attractions error:', err.message);
        res.status(500).json({ error: 'Failed to fetch attractions' });
    }
});

// GET /api/places/:placeId
router.get('/:placeId', async (req, res) => {
    try {
        const detail = await places.getPlaceDetails(req.params.placeId);

        const photos = (detail.photos || []).slice(0, 8).map(p => ({
            url:        places.getPhotoUrl(p.name, 1200),
            thumbUrl:   places.getPhotoUrl(p.name, 400),
            authorName: p.authorAttributions?.[0]?.displayName || null,
        }));

        const reviews = (detail.reviews || []).slice(0, 5).map(r => ({
            author:      r.authorAttribution?.displayName || 'Anonymous',
            rating:      r.rating,
            text:        r.text?.text || '',
            publishTime: r.publishTime,
        }));

        res.json({
            id:                  detail.id,
            name:                detail.displayName?.text,
            summary:             detail.editorialSummary?.text || null,
            rating:              detail.rating,
            ratingCount:         detail.userRatingCount,
            address:             detail.formattedAddress,
            type:                detail.primaryTypeDisplayName?.text || null,
            location:            detail.location,
            website:             detail.websiteUri || null,
            openNow:             detail.regularOpeningHours?.openNow ?? null,
            weekdayDescriptions: detail.regularOpeningHours?.weekdayDescriptions || [],
            photos,
            reviews,
        });
    } catch (err) {
        console.error('Place detail error:', err.message);
        res.status(500).json({ error: 'Failed to fetch place details' });
    }
});

module.exports = router;
