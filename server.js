const express = require('express');
const path    = require('path');
const app     = express();

// Static: frontend
app.use(express.static(path.join(__dirname, 'public')));

// Static: content images (served at /content/...)
app.use('/content', express.static(path.join(__dirname, 'content')));

// API routes
app.use('/api', require('./src/routes/images'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DriveWithAndy → http://localhost:${PORT}`));
