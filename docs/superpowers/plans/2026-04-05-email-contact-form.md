# Email Contact Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a glassmorphic modal email form so clients without WhatsApp can contact Andy, sending two branded HTML emails (enquiry notification to Andy, confirmation to client) via Nodemailer.

**Architecture:** A new `POST /api/contact` Express route validates the submitted form data and calls a mailer service that sends two emails in parallel using Nodemailer + Gmail SMTP. The frontend modal is triggered from the nav, footer, and tour cards; subject and message fields auto-fill from tour context matching the existing WhatsApp booking pattern.

**Tech Stack:** Node.js, Express 5, Nodemailer, HTML email templates with `{{placeholder}}` substitution, vanilla JS, CSS custom properties.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/services/mailer.js` | Nodemailer transport + `sendEnquiry(data)` |
| Create | `src/templates/enquiry.html` | Andy's notification email (inline-CSS HTML) |
| Create | `src/templates/confirmation.html` | Client confirmation email (inline-CSS HTML) |
| Create | `src/routes/contact.js` | `POST /api/contact` — validate + call mailer |
| Modify | `server.js` | Register `/api/contact` route |
| Modify | `public/index.html` | Modal HTML markup + nav/footer trigger points |
| Modify | `public/css/main.css` | Modal overlay, form, and animation styles |
| Modify | `public/js/app.js` | `openContactModal`, close handlers, form submit |
| Modify | `.env` | Add `SMTP_TO`, update SMTP credentials |

---

## Task 1: Install Nodemailer + update .env

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env`

- [ ] **Step 1: Install nodemailer**

```bash
cd /home/prince-ankamah-ofori/Projects/driveWithAndy
npm install nodemailer
```

Expected: nodemailer appears in `package.json` dependencies and `node_modules/nodemailer/` exists.

- [ ] **Step 2: Add SMTP_TO to .env**

Open `.env` and add `SMTP_TO` after the existing SMTP lines. Do **not** change any other values yet — SMTP credentials will be updated manually when the Gmail App Password is ready:

```
SMTP_TO=tettehanderson@gmail.com
```

The `.env` SMTP block should look like:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=sabastainofori@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxxxx
SMTP_FROM=sabastainofori@gmail.com
SMTP_TO=tettehanderson@gmail.com
SMTP_TLS=false
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env
git commit -m "chore: install nodemailer, add SMTP_TO env var"
```

---

## Task 2: Create mailer service

**Files:**
- Create: `src/services/mailer.js`

- [ ] **Step 1: Create the file**

```javascript
// src/services/mailer.js
'use strict';

const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');

function createTransport() {
    return nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
}

function loadTemplate(name) {
    return fs.readFileSync(
        path.join(__dirname, '../templates', name),
        'utf8'
    );
}

function fill(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '—');
}

async function sendEnquiry(data) {
    const transport = createTransport();

    const enquiryHtml      = fill(loadTemplate('enquiry.html'), data);
    const confirmationHtml = fill(loadTemplate('confirmation.html'), data);

    await Promise.all([
        transport.sendMail({
            from:    process.env.SMTP_FROM,
            to:      process.env.SMTP_TO,
            subject: `🔔 New Enquiry — ${data.subject}`,
            html:    enquiryHtml,
        }),
        transport.sendMail({
            from:    `Andy — DriveWithAndy <${process.env.SMTP_FROM}>`,
            to:      data.email,
            replyTo: process.env.SMTP_FROM,
            subject: '✅ We received your enquiry — DriveWithAndy',
            html:    confirmationHtml,
        }),
    ]);
}

module.exports = { sendEnquiry };
```

- [ ] **Step 2: Verify file loads without error**

```bash
node -e "require('./src/services/mailer'); console.log('OK')"
```

Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/services/mailer.js
git commit -m "feat: add nodemailer mailer service"
```

---

## Task 3: Create email templates

**Files:**
- Create: `src/templates/enquiry.html`
- Create: `src/templates/confirmation.html`

- [ ] **Step 1: Create templates directory**

```bash
mkdir -p src/templates
```

- [ ] **Step 2: Create Andy's notification template**

Create `src/templates/enquiry.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Enquiry — DriveWithAndy</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#032607;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;width:40px;height:40px;background:#c9a84c;border-radius:50%;text-align:center;line-height:40px;font-weight:bold;color:#032607;font-size:16px;vertical-align:middle;">D</span>
                    <span style="vertical-align:middle;margin-left:12px;">
                      <span style="display:block;color:#c9a84c;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">DriveWithAndy</span>
                      <span style="display:block;color:#ffffff;font-weight:bold;font-size:16px;">New Tour Enquiry</span>
                    </span>
                  </td>
                  <td align="right" style="color:rgba(255,255,255,0.4);font-size:11px;">🔔 New Enquiry</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 20px;color:#555;font-size:13px;">A client submitted an enquiry via the DriveWithAndy website.</p>

              <!-- Client Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-radius:6px;overflow:hidden;border:1px solid #eee;">
                <tr><td colspan="2" style="background:#032607;color:#c9a84c;padding:8px 16px;font-size:11px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">Client Details</td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;width:35%;background:#fafafa;border-bottom:1px solid #f0f0f0;">Name</td><td style="padding:8px 16px;font-weight:600;font-size:13px;border-bottom:1px solid #f0f0f0;">{{name}}</td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;background:#fafafa;border-bottom:1px solid #f0f0f0;">Email</td><td style="padding:8px 16px;font-size:13px;border-bottom:1px solid #f0f0f0;"><a href="mailto:{{email}}" style="color:#032607;text-decoration:none;">{{email}}</a></td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;background:#fafafa;border-bottom:1px solid #f0f0f0;">Phone</td><td style="padding:8px 16px;font-size:13px;border-bottom:1px solid #f0f0f0;">{{phone}}</td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;background:#fafafa;border-bottom:1px solid #f0f0f0;">Country</td><td style="padding:8px 16px;font-size:13px;border-bottom:1px solid #f0f0f0;">{{country}}</td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;background:#fafafa;border-bottom:1px solid #f0f0f0;">Travellers</td><td style="padding:8px 16px;font-size:13px;border-bottom:1px solid #f0f0f0;">{{travellers}}</td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;background:#fafafa;">Travel Date</td><td style="padding:8px 16px;font-size:13px;">{{travelDate}}</td></tr>
              </table>

              <!-- Enquiry -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-radius:6px;overflow:hidden;border:1px solid #eee;">
                <tr><td style="background:#032607;color:#c9a84c;padding:8px 16px;font-size:11px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">Enquiry</td></tr>
                <tr>
                  <td style="padding:16px;font-size:13px;">
                    <div style="color:#888;font-size:11px;margin-bottom:4px;">Subject</div>
                    <div style="font-weight:600;font-size:14px;margin-bottom:16px;color:#222;">{{subject}}</div>
                    <div style="color:#888;font-size:11px;margin-bottom:4px;">Message</div>
                    <div style="font-size:13px;line-height:1.7;color:#333;white-space:pre-line;">{{message}}</div>
                  </td>
                </tr>
              </table>

              <!-- Reply CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="mailto:{{email}}?subject=Re: {{subject}}" style="display:inline-block;background:#c9a84c;color:#032607;font-weight:bold;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:14px;">Reply to {{name}} →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;border-top:1px solid #eee;padding:12px 32px;text-align:center;font-size:10px;color:#aaa;">
              DriveWithAndy &nbsp;·&nbsp; Ghana Tourism Authority Licensed &nbsp;·&nbsp; tettehanderson@gmail.com
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

- [ ] **Step 3: Create client confirmation template**

Create `src/templates/confirmation.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We received your enquiry — DriveWithAndy</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#032607;padding:32px;text-align:center;">
              <div style="width:52px;height:52px;background:#c9a84c;border-radius:50%;margin:0 auto 12px;text-align:center;line-height:52px;font-weight:bold;color:#032607;font-size:20px;">D</div>
              <div style="color:#c9a84c;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">DriveWithAndy</div>
              <div style="color:#ffffff;font-size:18px;font-weight:bold;">We've received your message!</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 8px;color:#222;font-size:14px;">Hi <strong>{{name}}</strong>,</p>
              <p style="margin:0 0 20px;color:#555;font-size:13px;line-height:1.6;">Thank you for reaching out. Andy has received your enquiry and will get back to you within <strong>24 hours</strong>.</p>

              <!-- Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-radius:6px;overflow:hidden;border:1px solid #eee;">
                <tr><td colspan="2" style="background:#032607;color:#c9a84c;padding:8px 16px;font-size:11px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">Your Enquiry Summary</td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;width:35%;background:#fafafa;border-bottom:1px solid #f0f0f0;">Tour / Subject</td><td style="padding:8px 16px;font-weight:600;font-size:13px;border-bottom:1px solid #f0f0f0;">{{subject}}</td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;background:#fafafa;border-bottom:1px solid #f0f0f0;">Travel Date</td><td style="padding:8px 16px;font-size:13px;border-bottom:1px solid #f0f0f0;">{{travelDate}}</td></tr>
                <tr><td style="padding:8px 16px;color:#888;font-size:12px;background:#fafafa;">Travellers</td><td style="padding:8px 16px;font-size:13px;">{{travellers}}</td></tr>
              </table>

              <!-- Contact block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f0f7f1;border:1px solid #c3dfc6;border-radius:6px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-weight:bold;color:#032607;margin-bottom:8px;font-size:13px;">Need to reach Andy directly?</div>
                    <div style="color:#555;font-size:12px;margin-bottom:4px;">📞 +233 54 210 8051</div>
                    <div style="color:#555;font-size:12px;margin-bottom:4px;">💬 WhatsApp (preferred)</div>
                    <div style="color:#555;font-size:12px;">📧 tettehanderson@gmail.com</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0;text-align:center;color:#aaa;font-size:12px;">Akwaaba — Welcome to Ghana 🇬🇭</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;border-top:1px solid #eee;padding:12px 32px;text-align:center;font-size:10px;color:#aaa;">
              DriveWithAndy &nbsp;·&nbsp; Ghana Tourism Authority Licensed &nbsp;·&nbsp; tettehanderson@gmail.com
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add src/templates/
git commit -m "feat: add branded HTML email templates for enquiry and confirmation"
```

---

## Task 4: Create contact API route

**Files:**
- Create: `src/routes/contact.js`

- [ ] **Step 1: Create the file**

```javascript
// src/routes/contact.js
'use strict';

const express       = require('express');
const router        = express.Router();
const { sendEnquiry } = require('../services/mailer');

function sanitise(val) {
    return String(val || '').trim().replace(/<[^>]*>/g, '');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/contact', async (req, res) => {
    const { name, email, phone, country, subject, travellers, travelDate, message } = req.body;

    if (!sanitise(name))                    return res.status(400).json({ error: 'Name is required' });
    if (!sanitise(email))                   return res.status(400).json({ error: 'Email is required' });
    if (!isValidEmail(sanitise(email)))     return res.status(400).json({ error: 'Invalid email address' });
    if (!sanitise(subject))                 return res.status(400).json({ error: 'Subject is required' });
    if (!sanitise(message))                 return res.status(400).json({ error: 'Message is required' });

    const data = {
        name:       sanitise(name),
        email:      sanitise(email),
        phone:      sanitise(phone)      || '—',
        country:    sanitise(country)    || '—',
        subject:    sanitise(subject),
        travellers: sanitise(travellers) || '—',
        travelDate: sanitise(travelDate) || '—',
        message:    sanitise(message),
    };

    try {
        await sendEnquiry(data);
        res.json({ success: true });
    } catch (err) {
        console.error('Contact email error:', err.message);
        res.status(500).json({ error: 'Failed to send email. Please try again.' });
    }
});

module.exports = router;
```

- [ ] **Step 2: Verify file loads without error**

```bash
node -e "require('./src/routes/contact'); console.log('OK')"
```

Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/routes/contact.js
git commit -m "feat: add POST /api/contact route with input validation"
```

---

## Task 5: Register route in server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add the contact route registration**

In `server.js`, add this line after the existing `app.use('/api/places', ...)` line:

```javascript
app.use('/api', require('./src/routes/contact'));
```

The routes block in `server.js` should now read:

```javascript
// API routes
app.use('/api', require('./src/routes/images'));
app.use('/api/places', require('./src/routes/places'));
app.use('/api', require('./src/routes/contact'));
```

- [ ] **Step 2: Start the server and test the endpoint**

```bash
node server.js &
sleep 2
curl -s -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"","subject":"","message":""}' | node -e "process.stdin.resume();process.stdin.on('data',d=>console.log(JSON.parse(d)))"
```

Expected output: `{ error: 'Name is required' }`

```bash
kill %1
```

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: register /api/contact route in server"
```

---

## Task 6: Add modal HTML to index.html

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add "Contact" link to nav**

In `public/index.html`, find the `<ul class="nav-links">` and add a fifth item:

```html
<ul class="nav-links">
    <li><a href="#tours">Tours</a></li>
    <li><a href="#about">About</a></li>
    <li><a href="#fleet">Our Fleet</a></li>
    <li><a href="#resources">Resources</a></li>
    <li><a href="#" id="contact-nav-trigger">Contact</a></li>
</ul>
```

- [ ] **Step 2: Make footer email a trigger**

Find this line in the footer:

```html
<p><i class="fas fa-envelope"></i> tettehanderson@gmail.com</p>
```

Replace it with:

```html
<p><i class="fas fa-envelope"></i> <a href="#" id="contact-footer-trigger" class="footer-contact-link">tettehanderson@gmail.com</a></p>
```

- [ ] **Step 3: Add modal markup**

Insert the following block just before `<script src="js/app.js"></script>` at the bottom of `<body>`:

```html
<!-- Contact Modal -->
<div class="contact-modal-overlay" id="contact-modal-overlay" role="dialog" aria-modal="true" aria-label="Contact Andy">
    <div class="contact-modal" id="contact-modal">
        <div class="contact-modal-header">
            <div>
                <span class="contact-modal-eyebrow">Get In Touch</span>
                <h3 class="contact-modal-title">Send Andy a Message</h3>
                <p class="contact-modal-subtitle">We'll reply within 24 hours</p>
            </div>
            <button class="contact-modal-close" id="contact-modal-close" aria-label="Close">✕</button>
        </div>

        <form class="contact-form" id="contact-form" novalidate>
            <div class="contact-form-row">
                <div class="contact-field">
                    <label class="contact-label" for="cf-name">FULL NAME <span class="contact-required">*</span></label>
                    <input class="contact-input" type="text" id="cf-name" name="name" placeholder="Your name" required autocomplete="name">
                </div>
                <div class="contact-field">
                    <label class="contact-label" for="cf-email">EMAIL <span class="contact-required">*</span></label>
                    <input class="contact-input" type="email" id="cf-email" name="email" placeholder="you@email.com" required autocomplete="email">
                </div>
            </div>

            <div class="contact-form-row">
                <div class="contact-field">
                    <label class="contact-label" for="cf-phone">PHONE <span class="contact-optional">(optional)</span></label>
                    <input class="contact-input" type="tel" id="cf-phone" name="phone" placeholder="+1 555 000 0000" autocomplete="tel">
                </div>
                <div class="contact-field">
                    <label class="contact-label" for="cf-country">COUNTRY <span class="contact-optional">(optional)</span></label>
                    <input class="contact-input" type="text" id="cf-country" name="country" placeholder="United States" autocomplete="country-name">
                </div>
            </div>

            <div class="contact-field">
                <div class="contact-label-row">
                    <label class="contact-label" for="cf-subject">SUBJECT <span class="contact-required">*</span></label>
                    <span class="contact-autofill-badge">AUTO-FILLED</span>
                </div>
                <input class="contact-input contact-input-autofill" type="text" id="cf-subject" name="subject" required>
            </div>

            <div class="contact-form-row">
                <div class="contact-field">
                    <label class="contact-label" for="cf-travellers">NO. OF TRAVELLERS <span class="contact-optional">(optional)</span></label>
                    <input class="contact-input" type="text" id="cf-travellers" name="travellers" placeholder="2 people">
                </div>
                <div class="contact-field">
                    <label class="contact-label" for="cf-date">TRAVEL DATE <span class="contact-optional">(optional)</span></label>
                    <input class="contact-input" type="text" id="cf-date" name="travelDate" placeholder="dd / mm / yyyy">
                </div>
            </div>

            <div class="contact-field">
                <div class="contact-label-row">
                    <label class="contact-label" for="cf-message">MESSAGE <span class="contact-required">*</span></label>
                    <span class="contact-autofill-badge">AUTO-FILLED · EDITABLE</span>
                </div>
                <textarea class="contact-input contact-input-autofill contact-textarea" id="cf-message" name="message" rows="5" required></textarea>
            </div>

            <div class="contact-form-error" id="contact-form-error"></div>

            <button class="btn btn-primary contact-submit" type="submit" id="contact-submit">
                Send Message <i class="fas fa-arrow-right"></i>
            </button>

            <p class="contact-trust">🔒 Your details are never shared. Reply expected within 24 hrs.</p>
        </form>

        <div class="contact-success" id="contact-success">
            <div class="contact-success-icon"><i class="fas fa-check-circle"></i></div>
            <h3>Message Sent!</h3>
            <p>Andy will reply within 24 hours.<br>Check your inbox for a confirmation.</p>
        </div>
    </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: add contact modal HTML and trigger points in nav/footer"
```

---

## Task 7: Add modal CSS to main.css

**Files:**
- Modify: `public/css/main.css`

- [ ] **Step 1: Append the modal styles**

Add the following block at the very end of `public/css/main.css`:

```css
/* ── Contact Modal ─────────────────────────────────────────── */

.contact-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(3, 38, 7, 0.65);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
}

.contact-modal-overlay.open {
    opacity: 1;
    pointer-events: all;
}

.contact-modal {
    background: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-lg);
    padding: 2rem;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    overflow-y: auto;
    color: #fff;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    transform: translateY(16px);
    transition: transform 0.25s ease;
}

.contact-modal-overlay.open .contact-modal {
    transform: translateY(0);
}

.contact-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
}

.contact-modal-eyebrow {
    display: block;
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    color: var(--heritage-gold);
    text-transform: uppercase;
    margin-bottom: 0.3rem;
}

.contact-modal-title {
    margin: 0;
    font-size: 1.4rem;
    color: #fff;
    font-family: 'Noto Serif', serif;
}

.contact-modal-subtitle {
    margin: 0.3rem 0 0;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.55);
}

.contact-modal-close {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.contact-modal-close:hover { background: rgba(255, 255, 255, 0.2); }

.contact-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.contact-field {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.75rem;
}

.contact-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.3rem;
}

.contact-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.3rem;
}

.contact-label-row .contact-label { margin-bottom: 0; }

.contact-required { color: var(--heritage-gold); }

.contact-optional {
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.65rem;
    text-transform: none;
    letter-spacing: 0;
}

.contact-autofill-badge {
    font-size: 0.6rem;
    color: rgba(201, 168, 76, 0.6);
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.contact-input {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-md);
    padding: 0.6rem 0.85rem;
    font-size: 0.875rem;
    color: #fff;
    font-family: 'Manrope', sans-serif;
    transition: border-color 0.2s;
    width: 100%;
    box-sizing: border-box;
}

.contact-input::placeholder { color: rgba(255, 255, 255, 0.3); }

.contact-input:focus {
    outline: none;
    border-color: rgba(201, 168, 76, 0.6);
}

.contact-input.error { border-color: rgba(220, 80, 80, 0.7); }

.contact-input-autofill {
    background: rgba(201, 168, 76, 0.1);
    border-color: rgba(201, 168, 76, 0.3);
    color: #e8c96d;
}

.contact-input-autofill::placeholder { color: rgba(201, 168, 76, 0.4); }

.contact-input-autofill:focus { border-color: rgba(201, 168, 76, 0.7); }

.contact-textarea {
    resize: vertical;
    min-height: 120px;
    line-height: 1.6;
}

.contact-form-error {
    font-size: 0.82rem;
    color: #ff7070;
    margin-bottom: 0.75rem;
    display: none;
}

.contact-form-error.visible { display: block; }

.contact-submit { width: 100%; margin-bottom: 0.75rem; }

.contact-trust {
    text-align: center;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.35);
    margin: 0;
}

.contact-success {
    display: none;
    text-align: center;
    padding: 2rem 1rem;
}

.contact-success-icon {
    font-size: 3rem;
    color: var(--heritage-gold);
    margin-bottom: 1rem;
}

.contact-success h3 { color: #fff; margin: 0 0 0.5rem; }

.contact-success p {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.6;
}

.footer-contact-link {
    color: inherit;
    text-decoration: none;
}

.footer-contact-link:hover { color: var(--heritage-gold); }

@media (max-width: 480px) {
    .contact-form-row { grid-template-columns: 1fr; }
    .contact-modal { padding: 1.5rem; }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/css/main.css
git commit -m "feat: add contact modal CSS styles"
```

---

## Task 8: Add modal JavaScript to app.js

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Add the contact modal constants and helper functions**

Find the `// ── Global config` block at the top of `public/js/app.js` (line 7). Add the following block immediately after the `CONFIG` declaration and `loadConfig` function (after line 21, before `function waLink`):

```javascript
// ── Contact Modal ─────────────────────────────────────────────

const GENERAL_SUBJECT = 'General Tour Enquiry';
const GENERAL_MESSAGE = `Hi Andy! 👋\n\nI'm interested in booking a tour with DriveWithAndy and would like to know more about your services and availability.\n\nPlease let me know how we can get started.\n\nThank you!`;

function tourEmailMessage(name, desc) {
    return `Hi Andy! 👋\n\nI'd like to book a tour to:\n\n📍 ${name}\n${desc ? desc + '\n' : ''}\nPlease let me know your availability and pricing.\n\nThank you!`;
}

function openContactModal(subject = GENERAL_SUBJECT, message = GENERAL_MESSAGE) {
    const overlay = document.getElementById('contact-modal-overlay');
    if (!overlay) return;
    document.getElementById('cf-subject').value = subject;
    document.getElementById('cf-message').value = message;
    document.getElementById('contact-form').style.display = '';
    document.getElementById('contact-success').style.display = 'none';
    document.getElementById('contact-form-error').classList.remove('visible');
    document.querySelectorAll('.contact-input').forEach(i => i.classList.remove('error'));
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('cf-name')?.focus(), 300);
}

function closeContactModal() {
    const overlay = document.getElementById('contact-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function emailTour(name, desc) {
    openContactModal(`Enquiry about ${name}`, tourEmailMessage(name, desc));
}
```

- [ ] **Step 2: Add the submit and init functions**

Find `// ── Init ──` near the bottom of `app.js`. Insert the following block just before it:

```javascript
// ── Contact Modal Init ────────────────────────────────────────

async function submitContactForm() {
    const form      = document.getElementById('contact-form');
    const submitBtn = document.getElementById('contact-submit');
    const errorEl   = document.getElementById('contact-form-error');

    errorEl.classList.remove('visible');
    form.querySelectorAll('.contact-input').forEach(i => i.classList.remove('error'));

    const data = {
        name:       document.getElementById('cf-name').value.trim(),
        email:      document.getElementById('cf-email').value.trim(),
        phone:      document.getElementById('cf-phone').value.trim(),
        country:    document.getElementById('cf-country').value.trim(),
        subject:    document.getElementById('cf-subject').value.trim(),
        travellers: document.getElementById('cf-travellers').value.trim(),
        travelDate: document.getElementById('cf-date').value.trim(),
        message:    document.getElementById('cf-message').value.trim(),
    };

    let hasError = false;
    if (!data.name)  { document.getElementById('cf-name').classList.add('error');    hasError = true; }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        document.getElementById('cf-email').classList.add('error'); hasError = true;
    }
    if (!data.subject) { document.getElementById('cf-subject').classList.add('error'); hasError = true; }
    if (!data.message) { document.getElementById('cf-message').classList.add('error'); hasError = true; }

    if (hasError) {
        errorEl.textContent = 'Please fill in all required fields.';
        errorEl.classList.add('visible');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const res  = await fetch('/api/contact', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data),
        });
        const json = await res.json();

        if (res.ok && json.success) {
            document.getElementById('contact-form').style.display    = 'none';
            document.getElementById('contact-success').style.display = 'block';
            setTimeout(closeContactModal, 3000);
        } else {
            throw new Error(json.error || 'Something went wrong.');
        }
    } catch (err) {
        errorEl.textContent = err.message || 'Something went wrong. Please try again.';
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Message <i class="fas fa-arrow-right"></i>';
    }
}

function initContactModal() {
    const overlay = document.getElementById('contact-modal-overlay');
    if (!overlay) return;

    overlay.addEventListener('click', e => { if (e.target === overlay) closeContactModal(); });
    document.getElementById('contact-modal-close').addEventListener('click', closeContactModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContactModal(); });

    document.getElementById('contact-nav-trigger')?.addEventListener('click', e => {
        e.preventDefault();
        openContactModal();
    });

    document.getElementById('contact-footer-trigger')?.addEventListener('click', e => {
        e.preventDefault();
        openContactModal();
    });

    document.getElementById('contact-form').addEventListener('submit', e => {
        e.preventDefault();
        submitContactForm();
    });
}
```

- [ ] **Step 3: Register initContactModal in the DOMContentLoaded handler**

Find the `document.addEventListener('DOMContentLoaded', async () => {` block at the bottom of `app.js`. Add `initContactModal();` to the sync inits block:

```javascript
    // Sync inits
    initVideo();
    initViewMore();
    initHeader();
    initMobileMenu();
    initSmoothScroll();
    initContactModal();
```

- [ ] **Step 4: Commit**

```bash
git add public/js/app.js
git commit -m "feat: add contact modal JS — open/close, auto-fill, form submit"
```

---

## Task 9: Add email button to tour cards

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Update tourCardHTML to include email button**

Find the `tourCardHTML` function in `app.js`. Locate the `tour-card-actions` div inside it:

```javascript
            <div class="tour-card-actions">
                <a href="${detailUrl}" class="btn btn-outline" onclick="event.stopPropagation()">Learn More</a>
                <button class="btn btn-secondary" onclick="event.stopPropagation(); bookSingle('${place.id}', '${place.name.replace(/'/g, "\\'")}', '${(place.summary || '').replace(/'/g, "\\'").slice(0, 80)}', '${place.address || ''}')">Book Tour</button>
            </div>
```

Replace it with:

```javascript
            <div class="tour-card-actions">
                <a href="${detailUrl}" class="btn btn-outline" onclick="event.stopPropagation()">Learn More</a>
                <button class="btn btn-secondary" onclick="event.stopPropagation(); bookSingle('${place.id}', '${place.name.replace(/'/g, "\\'")}', '${(place.summary || '').replace(/'/g, "\\'").slice(0, 80)}', '${place.address || ''}')">Book Tour</button>
                <button class="btn btn-glass tour-email-btn" title="Email Andy about this tour" onclick="event.stopPropagation(); emailTour('${place.name.replace(/'/g, "\\'")}', '${(place.summary || '').replace(/'/g, "\\'").slice(0, 120)}')"><i class="fas fa-envelope"></i></button>
            </div>
```

- [ ] **Step 2: Add the email button style to main.css**

Append to the end of `public/css/main.css`:

```css
.tour-email-btn {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add public/js/app.js public/css/main.css
git commit -m "feat: add email icon button to tour cards to open contact modal"
```

---

## Task 10: End-to-end test

- [ ] **Step 1: Start the server**

```bash
node server.js
```

- [ ] **Step 2: Test validation — missing required fields**

In a new terminal:

```bash
curl -s -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"not-an-email","subject":"Test","message":"Hello"}' 
```

Expected: `{"error":"Invalid email address"}`

- [ ] **Step 3: Test validation — valid payload**

```bash
curl -s -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"valid@example.com","subject":"Test Enquiry","message":"Hello Andy"}'
```

Expected (before real SMTP is configured): `{"error":"Failed to send email. Please try again."}` with a nodemailer auth error in the server console — this is correct, it means the route and mailer are wired up correctly. The actual email send will succeed once the Gmail App Password is updated in `.env`.

- [ ] **Step 4: Open the site in a browser and verify the modal**

```bash
open http://localhost:3000
```

- Check "Contact" appears in the nav
- Click "Contact" — modal should slide in with glassmorphic overlay
- Subject should show "General Tour Enquiry" in gold
- Message should be pre-filled with the general template
- Click a tour card's envelope icon — modal should open with tour-specific subject and message
- Click the footer email address — modal should open
- Press ESC or click outside modal — modal should close
- Submit with empty required fields — red outlines should appear
- Submit with valid data — spinner shows, then success state, then auto-close after 3 seconds

- [ ] **Step 5: Update SMTP credentials and do a live email test**

When the Gmail App Password for `tettehanderson@gmail.com` is ready, update `.env`:

```
SMTP_USER=tettehanderson@gmail.com
SMTP_PASSWORD=<16-char app password>
SMTP_FROM=tettehanderson@gmail.com
```

Then restart the server and submit the form with a real email address. Verify:
- `tettehanderson@gmail.com` receives the structured enquiry notification
- The submitted email address receives the branded confirmation email

- [ ] **Step 6: Final commit**

```bash
git add .env
git commit -m "chore: update SMTP credentials to tettehanderson@gmail.com"
```
