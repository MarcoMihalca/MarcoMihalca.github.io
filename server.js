require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

// Inițializare bază de date (creează tabelele automat)
require('./config/database');
// Inițializare sistem automat de backup
require('./config/backupConfig');

const authRoutes = require('./routes/auth');
const pdfRoutes = require('./routes/pdf');
const invoiceRoutes = require('./routes/invoices');
const uploadRoutes = require('./routes/upload');
const emailRoutes = require('./routes/email');
const efacturaRoutes = require('./routes/efactura');

const app = express();
const PORT = 3000;

// --- Middleware global ---
app.use(express.json({ limit: '10mb' }));
app.use(session({
    secret: 'facturio-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 ore
}));

// --- Rute API ---
app.use('/api', authRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', uploadRoutes);
app.use('/api', emailRoutes);
app.use('/api', efacturaRoutes);
app.use('/', pdfRoutes);

// --- Redirecționare pentru pagini protejate (evită "flash" content) ---
app.use((req, res, next) => {
    const protectedRoutes = ['/', '/index.html', '/history.html', '/profile.html'];
    if (protectedRoutes.includes(req.path)) {
        if (!req.session.user) {
            return res.redirect('/login.html');
        }
    }
    next();
});

// --- Fișiere statice ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Pornire server ---
app.listen(PORT, () => console.log(`🚀 Facturio e LIVE pe http://localhost:${PORT}`));