require('dotenv').config();

const express = require('express');
const path    = require('path');
const app     = express();

app.use(express.json());

// Static: frontend
app.use(express.static(path.join(__dirname, 'public')));

// Static: content images (served at /content/...)
app.use('/content', express.static(path.join(__dirname, 'content')));

// Public config (safe values only — never expose secret keys here)
app.get('/api/config', (req, res) => {
    res.json({ whatsapp: process.env.WHATSAPP_NUMBER });
});

// API routes
app.use('/api', require('./src/routes/images'));
app.use('/api/places', require('./src/routes/places'));
app.use('/api', require('./src/routes/contact'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DriveWithAndy → http://localhost:${PORT}`));
