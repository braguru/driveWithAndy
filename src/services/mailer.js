// src/services/mailer.js
'use strict';

const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');

const LOGO_URL  = 'https://raw.githubusercontent.com/braguru/driveWithAndy/main/public/assets/logos/logo-dark.png';
const LOGO_PATH = path.join(__dirname, '../../public/assets/logos/logo-dark.png');
const LOGO_CID  = 'dwa-logo@drivewithandy';

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

const logoAttachment = {
    filename:    'logo.png',
    path:        LOGO_PATH,
    cid:         LOGO_CID,
    contentType: 'image/png',
    contentDisposition: 'inline',
};

async function sendEnquiry(data) {
    const transport = createTransport();

    // Use remote URL for Gmail (which blocks CID); CID attachment as fallback for other clients
    const templateData = { ...data, logoCid: LOGO_URL };

    const enquiryHtml      = fill(loadTemplate('enquiry.html'), templateData);
    const confirmationHtml = fill(loadTemplate('confirmation.html'), templateData);

    await Promise.all([
        transport.sendMail({
            from:        process.env.SMTP_FROM,
            to:          process.env.SMTP_TO,
            subject:     `🔔 New Enquiry — ${data.subject}`,
            html:        enquiryHtml,
            attachments: [logoAttachment],
        }),
        transport.sendMail({
            from:        `Andy — DriveWithAndy <${process.env.SMTP_FROM}>`,
            to:          data.email,
            replyTo:     process.env.SMTP_FROM,
            subject:     '✅ We received your enquiry — DriveWithAndy',
            html:        confirmationHtml,
            attachments: [logoAttachment],
        }),
    ]);
}

async function sendAdminCode(to, code) {
    const transport = createTransport();

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#231f20">
        <img src="${LOGO_URL}" alt="DriveWithAndy" style="height:48px;margin-bottom:24px">
        <h1 style="font-size:20px;margin:0 0 8px">Your sign-in code</h1>
        <p style="margin:0 0 24px;color:#5a5654">Use this code to sign in to the DriveWithAndy admin page.</p>
        <p style="font-size:34px;letter-spacing:10px;font-weight:700;margin:0 0 24px">${code}</p>
        <p style="margin:0;color:#5a5654;font-size:14px">
          It expires in 10 minutes. If you did not ask for it, ignore this email
          and consider changing your password.
        </p>
      </div>`;

    await transport.sendMail({
        from:    `DriveWithAndy <${process.env.SMTP_FROM}>`,
        to,
        subject: `${code} is your DriveWithAndy admin code`,
        text:    `Your DriveWithAndy admin sign-in code is ${code}. It expires in 10 minutes.`,
        html,
    });
}

module.exports = { sendEnquiry, sendAdminCode };
