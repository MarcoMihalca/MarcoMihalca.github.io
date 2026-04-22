const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.user = { id: user.id, username: user.username };
        return res.json({ success: true, message: 'Autentificare reușită!' });
    }
    res.status(401).json({ success: false, message: 'Utilizator sau parolă incorectă.' });
});

// Register
router.post('/register', (req, res) => {
    const { username, password } = req.body;
    
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
        return res.status(400).json({ success: false, message: 'Numele de utilizator este deja folosit.' });
    }

    try {
        const hash = bcrypt.hashSync(password, 10);
        const insert = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const result = insert.run(username, hash);
        
        req.session.user = { id: result.lastInsertRowid, username };
        res.json({ success: true, message: 'Cont creat cu succes!' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Eroare la crearea contului.' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// Utilizator curent
router.get('/me', (req, res) => {
    if (req.session.user) {
        return res.json({ id: req.session.user.id, username: req.session.user.username });
    }
    res.status(401).json({ message: 'Neautentificat' });
});

module.exports = router;
