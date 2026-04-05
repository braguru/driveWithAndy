// src/routes/contact.js
'use strict';

const express         = require('express');
const router          = express.Router();
const { sendEnquiry } = require('../services/mailer');

function sanitise(val) {
    return String(val || '').trim().replace(/<[^>]*>/g, '');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/contact', async (req, res) => {
    const { name, email, phone, country, subject, travellers, travelDate, message } = req.body;

    if (!sanitise(name))                return res.status(400).json({ error: 'Name is required' });
    if (!sanitise(email))               return res.status(400).json({ error: 'Email is required' });
    if (!isValidEmail(sanitise(email))) return res.status(400).json({ error: 'Invalid email address' });
    if (!sanitise(subject))             return res.status(400).json({ error: 'Subject is required' });
    if (!sanitise(message))             return res.status(400).json({ error: 'Message is required' });

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
