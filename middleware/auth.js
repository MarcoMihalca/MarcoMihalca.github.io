// --- Middleware protecție rute ---
function requireAuth(req, res, next) {
    if (req.session.user) return next();
    res.status(401).json({ message: 'Neautorizat' });
}

module.exports = requireAuth;
