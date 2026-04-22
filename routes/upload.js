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
        // file.fieldname poate fi 'logo', 'avatar', sau 'standard_logo'
        cb(null, `${file.fieldname}_${userId}${ext}`);
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

// Helper pentru a găsi și servi/șterge un fișier după prefix
function handleGetFile(req, res, prefix) {
    const userId = req.session.user.id;
    const extensions = ['.png', '.jpg', '.jpeg', '.svg'];
    
    for (const ext of extensions) {
        const filePath = path.join(uploadsDir, `${prefix}_${userId}${ext}`);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    
    res.status(404).json({ message: 'Fișier negăsit.' });
}

function handleDeleteFile(req, res, prefix) {
    const userId = req.session.user.id;
    const extensions = ['.png', '.jpg', '.jpeg', '.svg'];
    
    for (const ext of extensions) {
        const filePath = path.join(uploadsDir, `${prefix}_${userId}${ext}`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    
    res.json({ success: true });
}

// --- RUTE LOGO TEMPORAR ---
router.post('/upload-logo', requireAuth, upload.single('logo'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Niciun fișier selectat.' });
    res.json({ success: true, message: 'Logo temporar încărcat!', path: `/api/logo` });
});
router.get('/logo', requireAuth, (req, res) => handleGetFile(req, res, 'logo'));
router.delete('/logo', requireAuth, (req, res) => handleDeleteFile(req, res, 'logo'));

// --- RUTE LOGO STANDARD ---
router.post('/upload-standard-logo', requireAuth, upload.single('standard_logo'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Niciun fișier selectat.' });
    res.json({ success: true, message: 'Logo standard încărcat!', path: `/api/standard-logo` });
});
router.get('/standard-logo', requireAuth, (req, res) => handleGetFile(req, res, 'standard_logo'));
router.delete('/standard-logo', requireAuth, (req, res) => handleDeleteFile(req, res, 'standard_logo'));

// --- RUTE AVATAR ---
router.post('/upload-avatar', requireAuth, upload.single('avatar'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Niciun fișier selectat.' });
    res.json({ success: true, message: 'Avatar încărcat!', path: `/api/avatar` });
});
router.get('/avatar', requireAuth, (req, res) => handleGetFile(req, res, 'avatar'));
router.delete('/avatar', requireAuth, (req, res) => handleDeleteFile(req, res, 'avatar'));

// Cale fișier pentru PDF (utilizare internă)
router.getFilePath = function(userId, prefix) {
    const extensions = ['.png', '.jpg', '.jpeg'];
    for (const ext of extensions) {
        const filePath = path.join(uploadsDir, `${prefix}_${userId}${ext}`);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
};

module.exports = router;
