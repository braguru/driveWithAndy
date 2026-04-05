# Email Contact Form — Design Spec
**Date:** 2026-04-05
**Project:** DriveWithAndy
**Feature:** Client-to-driver email contact form

---

## Overview

Add a modal-based email contact form so clients who cannot use WhatsApp can reach Andy directly via email. The form sends two branded HTML emails on submission: an enquiry notification to Andy and a confirmation to the client.

---

## Architecture

```
Client fills modal form
        ↓
POST /api/contact (Express)
        ↓
Input validation (server-side)
        ↓
Nodemailer sends two emails in parallel:
    ├── TO: tettehanderson@gmail.com  → Enquiry notification
    └── TO: client's email            → Booking confirmation
```

### New Files
| File | Purpose |
|---|---|
| `src/routes/contact.js` | POST `/api/contact` endpoint — validates input, calls mailer |
| `src/services/mailer.js` | Nodemailer transport setup + `sendEnquiry()` function |
| `src/templates/enquiry.html` | Andy's notification email template |
| `src/templates/confirmation.html` | Client confirmation email template |

### Modified Files
| File | Change |
|---|---|
| `server.js` | Register `app.use('/api', require('./src/routes/contact'))` |
| `public/index.html` | Add modal HTML markup + "Contact Andy" trigger button in nav |
| `public/css/main.css` | Modal overlay, form field, and animation styles |
| `public/js/app.js` | `openContactModal(subject, message)`, modal close, form submit, success/error state |
| `.env` | Update SMTP credentials to `tettehanderson@gmail.com` |

---

## SMTP Configuration

Update `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tettehanderson@gmail.com
SMTP_PASSWORD=<gmail app password from tettehanderson@gmail.com>
SMTP_FROM=tettehanderson@gmail.com
SMTP_TO=tettehanderson@gmail.com
SMTP_TLS=false
```

**Gmail App Password setup:**
1. Enable 2-Step Verification on `tettehanderson@gmail.com`
2. Google Account → Security → App passwords → Create → Name: "DriveWithAndy"
3. Paste the 16-character password as `SMTP_PASSWORD`

---

## Modal Form

### Trigger Points
- **Nav bar** — "Contact Andy" link (desktop + mobile menu)
- **Footer** — the static `tettehanderson@gmail.com` email text becomes a clickable trigger
- **Tour cards** — the existing "Book Tour" button can optionally open the modal pre-filled (WhatsApp remains default; email modal as fallback)

### Fields
| Field | Required | Notes |
|---|---|---|
| Full Name | Yes | |
| Email | Yes | |
| Phone / WhatsApp | No | Labelled "optional" |
| Country | No | Labelled "optional" |
| Subject | Yes | Auto-filled from tour context, editable. Gold-tinted to signal auto-fill |
| No. of Travellers | No | Labelled "optional" |
| Travel Date | No | Labelled "optional" |
| Message | Yes | Auto-filled with same template as WhatsApp `bookSingle()`, editable |

### Auto-fill Logic

**Opened from a tour card:**
```
Subject: "Enquiry about [Tour Name]"

Message:
Hi Andy! 👋

I'd like to book a tour to:

📍 [Tour Name]
[Tour description from TOUR_META]

Please let me know your availability and pricing.

Thank you!
```

**Opened from nav / footer (no tour context):**
```
Subject: "General Tour Enquiry"

Message:
Hi Andy! 👋

I'm interested in booking a tour with DriveWithAndy and would like to know more about your services and availability.

Please let me know how we can get started.

Thank you!
```

### Visual Design
- Glassmorphic overlay (`rgba(255,255,255,0.07)`, `backdrop-filter: blur(20px)`)
- Dark green background (`#032607`) consistent with site palette
- Gold (`#c9a84c`) accents for auto-filled fields, labels, and CTA button
- Auto-filled fields (Subject, Message) have gold-tinted background + "AUTO-FILLED · EDITABLE" badge
- Close button (✕) top-right; clicking overlay backdrop also closes
- Trust line below CTA: "🔒 Your details are never shared. Reply expected within 24 hrs."

---

## Email Templates

### Andy's Notification (`src/templates/enquiry.html`)
- **From:** `tettehanderson@gmail.com`
- **To:** `tettehanderson@gmail.com`
- **Subject:** `🔔 New Enquiry — [subject from form]`
- **Content:**
  - Dark green header bar with DriveWithAndy logo/initial
  - Client details table: Name, Email, Phone, Country, Travellers, Travel Date
  - Enquiry section: Subject + full message body
  - Gold "Reply to [Client Name] →" button (`mailto:` link)
  - Footer: brand name + license line

### Client Confirmation (`src/templates/confirmation.html`)
- **From:** `Andy — DriveWithAndy <tettehanderson@gmail.com>`
- **To:** client's email address
- **Subject:** `✅ We received your enquiry — DriveWithAndy`
- **Content:**
  - Dark green header with logo, "We've received your message!"
  - Personalised greeting: "Hi [Name],"
  - 24-hour reply promise
  - Enquiry summary card: Tour (subject), Travel Date, No. of Travellers
  - Andy's direct contact block: phone, WhatsApp note, email
  - "Akwaaba — Welcome to Ghana 🇬🇭" sign-off
  - Footer: brand name + license line

---

## API Endpoint

### `POST /api/contact`

**Request body:**
```json
{
  "name": "Sarah Johnson",
  "email": "sarah@email.com",
  "phone": "+1 555 234 5678",
  "country": "United States",
  "subject": "Enquiry about Cape Coast Castle",
  "travellers": "2",
  "travelDate": "15 June 2026",
  "message": "Hi Andy! 👋\n\nI'd like to book..."
}
```

**Validation (server-side):**
- `name`, `email`, `subject`, `message` — required, non-empty strings
- `email` — valid email format
- All fields sanitised (trim, strip HTML tags) before use in email templates

**Success response:** `200 { success: true }`

**Error responses:**
- `400` — validation failure with field-level error message
- `500` — mailer error (logged server-side, generic message to client)

---

## Frontend Behaviour

### Submit Flow
1. Client clicks "Send Message →"
2. Button shows spinner, disabled
3. `fetch('POST /api/contact', body)`
4. **On success:** Modal content replaced with a success state ("Message sent! Andy will reply within 24 hours.") — auto-closes after 3 seconds
5. **On error:** Inline error banner below the form ("Something went wrong. Please try again or email Andy directly.")

### Validation (client-side)
- Required fields highlighted in red on blur if empty
- Email format validated before submit
- Prevents double-submit while request is in flight

---

## Out of Scope
- Rate limiting / spam protection (can be added later)
- File attachments
- CMS or database storage of enquiries
- Email threading / conversation history
