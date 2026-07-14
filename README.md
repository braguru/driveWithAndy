# DriveWithAndy 🇬🇭

A premium web application showcasing authentic Ghana tours, private driver services, and travel resources. Built with a focus on rich aesthetics, high-performance interactions, and seamless user experience.

## ✨ Features

- **Immersive Hero Section**: Dynamic background slider featuring high-quality imagery of Ghana's landscapes.
- **Popular Expeditions**: Curated tour cards with pricing, descriptions, and high-quality visuals.
- **Ghana Travel Dashboard**: Essential travel information including Visa requirements, Health & Safety, and Cultural Etiquette.
- **Verified Expeditions**: A dedicated section for social proof featuring real tour footage and photos.
- **Dynamic Content**: API-driven image and place listings for scalability.
- **Direct Booking**: Seamless WhatsApp integration for instant communication.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism & CSS Variables), and JavaScript (Vanilla JS).
- **Backend**: Node.js with Express.js.
- **Maps & Places**: Google Maps Platform. The server calls the Places API (New) for destination data, and the expedition page embeds a map with the Maps Embed API.
- **Email**: Nodemailer over SMTP for the contact form.
- **Styling**: Google Fonts (Noto Serif & Manrope), FontAwesome Icons.
- **Environment Management**: `dotenv` for secure configuration.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- `npm` (usually bundled with Node.js)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd driveWithAndy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your own values:
   ```bash
   cp .env.example .env
   ```

   | Variable | Required | Purpose |
   |----------|----------|---------|
   | `GOOGLE_MAP_API` | Yes | Google Maps Platform key. Used server-side for the Places API (New) and served to the browser for the Maps Embed map. |
   | `WHATSAPP_NUMBER` | Yes | Booking number in `233XXXXXXXXX` format (country code, no `+`). |
   | `PORT` | No | Port to run on. Defaults to `3000`. |
   | `SMTP_HOST` | Yes (for contact form) | SMTP server host, e.g. `smtp.gmail.com`. |
   | `SMTP_PORT` | Yes (for contact form) | SMTP port, e.g. `465`. |
   | `SMTP_USER` | Yes (for contact form) | SMTP account username. |
   | `SMTP_PASSWORD` | Yes (for contact form) | SMTP password or app password. |
   | `SMTP_FROM` | Yes (for contact form) | The "from" address on outgoing mail. |
   | `SMTP_TO` | Yes (for contact form) | Where enquiry emails are delivered. |

   Never commit `.env`. It is gitignored. The `GOOGLE_MAP_API` value is a secret, keep it out of version control and out of these docs.

4. **Set up the Google Maps Platform key**:
   The map and destination data will not work without a properly provisioned key.
   1. In the [Google Cloud Console](https://console.cloud.google.com/), select or create a project.
   2. Link an **active billing account** to that project. Places API (New) returns `403 PERMISSION_DENIED` without one, even inside the free tier.
   3. Enable both **Places API (New)** and **Maps Embed API** (APIs & Services → Library).
   4. Create an API key (APIs & Services → Credentials) and put it in `.env` as `GOOGLE_MAP_API`.
   5. Recommended: restrict the key to HTTP referrers (`http://localhost:3000/*` and your production domain) plus the two APIs above.

   Quick check that the key works:
   ```bash
   curl -s -X POST "https://places.googleapis.com/v1/places:searchText" \
     -H "Content-Type: application/json" \
     -H "X-Goog-Api-Key: $GOOGLE_MAP_API" \
     -H "X-Goog-FieldMask: places.id,places.displayName" \
     -d '{"textQuery":"Cape Coast Castle Ghana","maxResultCount":1}'
   ```
   A JSON place means it works. `403` or `API_KEY_INVALID` means billing, API enablement, or the key itself needs attention.

5. **Start the server**:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

## 📁 Project Structure

```text
├── content/           # Original high-res assets & tour imagery
├── public/            # Static files served to the client
│   ├── css/           # Design system and page styles
│   ├── js/            # Client-side logic & slider functionality
│   ├── assets/        # Client-side images & icons
│   ├── index.html     # Landing page
│   └── expedition.html# Tour details page
├── src/               # Backend source code
│   ├── routes/        # API endpoints
│   └── services/      # Business logic & data management
├── server.js          # Application entry point
└── package.json       # Dependencies and scripts
```

## 🔌 API Endpoints

- `GET /api/config`: Public config safe for the browser (WhatsApp number).
- `GET /api/places/config`: Returns the Maps key for the browser Embed map.
- `GET /api/places/attractions?offset=0&limit=6`: Paginated list of Ghana attractions from the Places API.
- `GET /api/places/:placeId`: Full detail for one destination (photos, reviews, hours, location).
- `GET /api/places/photo?name=...&w=800`: Proxies a Google place photo through the server so the key stays hidden and CORS is handled.
- `GET /api/images/:folder`: Lists image files in a `content/` subfolder (used by the hero slider and gallery).
- `POST /api/contact`: Sends an enquiry email via SMTP.

## 🚀 Deployment (Vercel)

The production site runs on Vercel. The environment variables above are **not** read from `.env` in production; they come from the Vercel project settings.

1. Vercel dashboard → project → **Settings → Environment Variables**.
2. Set every variable from the table above (at minimum `GOOGLE_MAP_API` and `WHATSAPP_NUMBER`), scoped to the **Production** environment.
3. **Redeploy.** Environment variable changes only take effect on a new deployment, not on existing ones.

If production shows empty destinations or a missing map while local works, the usual cause is a stale or wrong `GOOGLE_MAP_API` in Vercel. Confirm what production is serving with:
```bash
curl -s https://<your-domain>/api/places/attractions?limit=1
```
An empty `{"total":0}` means the production key is failing its Google API calls.

If the key is restricted by HTTP referrer, add your production domain (for example `https://<your-domain>/*`) or the browser Embed map will not load in production.

## 📄 License

This project is intended for the private use of DriveWithAndy Tours.
