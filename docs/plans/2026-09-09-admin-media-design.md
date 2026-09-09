# Admin media manager

Design agreed 2026-09-09. Lets Andy add and manage site photos and videos
himself, without a developer and without a redeploy.

## Why this shape

Everything below follows from one verified constraint: production runs
`server.js` as a Vercel serverless function, so the filesystem is read only.
Media currently lives in `content/` inside the deployment bundle, which is why
adding a photo today means a commit and a redeploy. An upload form that writes
to `content/` would work on a laptop and fail silently in production.

Verified, not assumed:

- Production serves the API dynamically (`/api/images/gallery` returns live
  JSON from the deployed function).
- Vercel caps serverless request bodies at 4.5MB. The existing
  `content/expeditions/kakum_national_park.jpg` is already 4.7MB.
- `onUploadCompleted` never fires against localhost, per Vercel's docs.

## Decisions

| Question | Decision |
| --- | --- |
| Storage | Vercel Blob |
| Metadata | One `manifest.json` in Blob, no database |
| Captions | Andy types them on upload, and can edit existing ones |
| Actions | Upload, delete, edit captions, reorder |
| Existing files | Migrate all 36 to Blob, keep `content/` as a fallback |
| Login | Six digit code emailed via the existing SMTP setup |

## Storage layout

```
media/hero/<id>-<slug>.jpg
media/gallery/<id>-<slug>.mp4
media/fleet/<id>-<slug>.jpg
manifest.json
```

The manifest is the source of truth for what the site shows:

```json
{
  "items": [
    {
      "id": "a1b2c3",
      "section": "gallery",
      "url": "https://<store>.public.blob.vercel-storage.com/media/gallery/a1b2c3-cape-coast.jpg",
      "kind": "image",
      "caption": "Andy at Cape Coast Castle",
      "tag": "Cape Coast",
      "order": 3,
      "deletedAt": null
    }
  ]
}
```

A JSON file rather than a database: one user, about 40 records, changes
weekly. A database is a service to provision, pay for and back up for
something a 20KB file handles. The shape ports to a table directly if the
site ever outgrows it.

`deletedAt` is a soft delete, so a mistap hides a photo instead of destroying
it. `order` drives drag to reorder, which is control the site does not have
today; current ordering is whatever the filesystem returns.

The server caches the manifest in memory for 60 seconds, the same approach
`src/services/places.js` already uses for Google results.

## Login

Env vars, all set in the Vercel dashboard and never committed:
`ADMIN_EMAIL`, `ADMIN_SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`. The Blob store
must be created with **Public** access, since the media URLs are embedded in
the public site.

1. Andy enters his email at `/admin`.
2. If it matches `ADMIN_EMAIL`, a six digit code is emailed through the
   existing Nodemailer setup. If it does not match, the page shows the same
   message anyway, so it cannot be used to discover who the admin is.
3. He enters the code and gets a session cookie lasting 7 days.

Serverless functions keep no memory between requests, so the pending code
lives in Blob: an HMAC of the code keyed by `ADMIN_SESSION_SECRET`, a 10
minute expiry, and an attempt counter. Three wrong guesses burns it. Sends are
capped at 5 per hour.

The record sits in the same public store as the media rather than a private
one, because a store rejecting the write would lock everyone out of signing
in. Nothing in it is usable without the secret.

Only actual sends count towards the rate limit. Counting every request would
let anyone lock Andy out for an hour by posting to a public endpoint five
times.

The session cookie needs no storage. It is the email, an expiry and an HMAC
signature over both, set `httpOnly`, `Secure` and `SameSite=Lax`. Changing
`ADMIN_SESSION_SECRET` in Vercel invalidates every session at once.

Every write route checks the cookie. Serving the admin HTML is not the thing
being protected; the upload and delete endpoints are. `/admin` also gets
`noindex` and a robots rule.

## Uploads

Files bypass our function entirely, because of the 4.5MB cap.

1. Browser calls `POST /api/admin/blob-token`.
2. That route verifies the session, then returns a short lived upload token
   that pins the allowed content types.
3. Browser uploads straight to Blob and receives a URL.
4. Browser calls `POST /api/admin/media` with the pathname, caption and tag.
   The server then asks Blob directly, with `head(pathname)`, for the real URL
   and content type before writing the manifest, so a URL supplied by the
   browser is never trusted.

Step 4 deliberately does not use Vercel's `onUploadCompleted` webhook, even
though recording the file there looks natural. That webhook cannot reach
localhost, so building on it would make the feature untestable outside
production or an ngrok tunnel. A confirmation call from the browser behaves
identically in both places.

Limits: 15MB per image, 200MB per video. Accepted types are jpeg, png, webp,
avif and mp4.

## Serving the public site

`GET /api/media/:section` returns the manifest entries for hero, gallery or
fleet, ordered, with deleted items removed. `fetchImages()` in
`public/js/app.js` points there, and the three render functions read `url`,
`caption` and `tag`. `GALLERY_META` and its hardcoded WhatsApp filenames are
deleted.

`src/routes/images.js` and the `content/` folder stay as a fallback. If Blob
is unreachable the site shows the original photos instead of empty sections.

## Migration

`scripts/migrate-media.js` runs once from a laptop. It walks `content/`,
uploads all 36 files to Blob, and carries the existing `GALLERY_META` captions
across. Re-running it is safe.

## Out of scope

The Popular Expeditions cards stay uneditable. Those photos come from the
Google Places API, not from us. Andy controls hero, gallery and fleet only.
Giving him control of expedition photos means an override layer, which is
separate work.

## Accepted risk

Whoever controls Andy's inbox can change the site's imagery. That is the
trade for skipping real user accounts, and it is reasonable for one trusted
operator on a marketing site. Rotating `ADMIN_SESSION_SECRET` is the kill
switch.

## Files

New: `public/admin.html`, `public/js/admin.js`, `public/css/admin.css`,
`src/routes/admin.js`, `src/routes/media.js`, `src/services/blob.js`,
`src/services/manifest.js`, `src/services/adminAuth.js`,
`scripts/migrate-media.js`

Changed: `server.js`, `public/js/app.js`, `package.json`, `.env.example`,
`README.md`, `CLAUDE.md`
