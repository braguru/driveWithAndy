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
