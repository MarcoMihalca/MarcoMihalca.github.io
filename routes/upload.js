const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const requireAuth = require('../middleware/auth');

// Director pentru upload-uri
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurare multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const userId = req.session.user.id;
        const ext = path.extname(file.originalname);
        cb(null, `logo_${userId}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.svg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Doar fișiere PNG, JPG sau SVG sunt acceptate.'));
        }
    }
});

// Upload logo
router.post('/upload-logo', requireAuth, upload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Niciun fișier selectat.' });
    }
    res.json({ 
        success: true, 
        message: 'Logo încărcat!',
        path: `/api/logo`
    });
});

// Servire logo
router.get('/logo', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const extensions = ['.png', '.jpg', '.jpeg', '.svg'];
    
    for (const ext of extensions) {
        const filePath = path.join(uploadsDir, `logo_${userId}${ext}`);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    
    res.status(404).json({ message: 'Logo negăsit.' });
});

// Ștergere logo
router.delete('/logo', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const extensions = ['.png', '.jpg', '.jpeg', '.svg'];
    
    for (const ext of extensions) {
        const filePath = path.join(uploadsDir, `logo_${userId}${ext}`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    
    res.json({ success: true });
});

// Cale logo pentru PDF (utilizare internă)
router.getLogoPath = function(userId) {
    const extensions = ['.png', '.jpg', '.jpeg'];
    for (const ext of extensions) {
        const filePath = path.join(uploadsDir, `logo_${userId}${ext}`);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
};

module.exports = router;
