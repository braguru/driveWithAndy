# CLAUDE.md

Guidance for working in this repository.

## What this is

DriveWithAndy is a marketing and booking site for Ghana tours. It is a plain
Node.js + Express server that serves a vanilla HTML/CSS/JS frontend and a small
JSON API. There is no build step and no frontend framework.

- Entry point: `server.js`
- Backend: `src/routes/` (route handlers) and `src/services/` (logic)
- Frontend: `public/` (`index.html`, `expedition.html`, `admin.html`, `css/`, `js/`)
- Media: stored in Vercel Blob and described by a `manifest.json` in the same
  store. The hero, gallery and fleet read `GET /api/media/:section`. The files
  in `content/` are the fallback for when Blob is unreachable.

## Running it

```bash
npm install
cp .env.example .env   # then fill in real values
npm start              # http://localhost:3000
```

## Environment variables

All config comes from `.env` locally and from Vercel project settings in
production. See the table in `README.md`. The important ones:

- `GOOGLE_MAP_API`: Google Maps Platform key. Used server-side for the Places
  API (New) in `src/services/places.js`, and served to the browser via
  `GET /api/places/config` for the Maps Embed map in `public/js/expedition.js`.
- `WHATSAPP_NUMBER`: booking number.
- `SMTP_*`: contact form email via Nodemailer.

`.env` is gitignored. Never write real keys or secrets into committed files,
including this one and the README. Use placeholders.

## Google Maps Platform

The map and all destination data depend on a correctly provisioned key:

- The project must have **active billing** and both **Places API (New)** and
  **Maps Embed API** enabled. Without billing, Google returns
  `403 PERMISSION_DENIED`; with a deleted or wrong key you get
  `API_KEY_INVALID`.
- The Maps Embed API map is free; Places API (New) has a monthly free tier.
  `src/services/places.js` caches results for 24h to keep call volume low.
- Server-side Places calls send no HTTP referrer. If the key is referrer
  restricted, that does not block the server, but it does block the browser
  Embed map, so referrer allowlists must include every domain the site runs on
  (localhost and production).

## Media and the admin page

`/admin` lets Andy manage the hero, gallery and fleet himself. See the Media
section in `README.md` for setup. Points that matter when changing this code:

- **Production has a read-only filesystem.** It runs as a Vercel serverless
  function, so nothing can be written to `content/`. Any new media has to go
  to Blob.
- **Vercel caps request bodies at 4.5MB**, which is smaller than some existing
  photos. Uploads therefore go browser to Blob directly, with the server only
  minting a token. Do not add a route that accepts the file itself.
- **Do not build on Blob's `onUploadCompleted` webhook.** It cannot reach
  localhost, so anything depending on it is untestable outside production.
  The browser confirms the upload instead, and the server verifies it with
  `head()` rather than trusting a client-supplied URL.
- The manifest is read-modify-write on one JSON document. That is safe only
  because there is a single admin.
- `src/services/manifest.js` caches for 60s per function instance, so an edit
  can take up to a minute to reach every visitor.
- Gallery captions used to be hardcoded by filename in `public/js/app.js`.
  They now live in the manifest. Do not reintroduce a filename-keyed map.

## Deployment

Production is on Vercel. Environment variables live in the Vercel dashboard, not
in `.env`, and changes require a redeploy to take effect. A common failure is
production serving a stale `GOOGLE_MAP_API` while local works fine. See the
Deployment section in `README.md`.

## Conventions

- Match the existing vanilla-JS style. No frameworks, no bundler.
- Frontend fetches data from the `/api/...` endpoints; keep secret keys on the
  server and expose only safe values through `/api/config` and
  `/api/places/config`.
- When an image can be missing, guard `onerror` handlers so they cannot loop
  (set `this.onerror = null` before assigning a fallback `src`).
