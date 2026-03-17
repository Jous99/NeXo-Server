const express = require('express');
const router = express.Router();

// Endpoint: POST /api/v1/login
router.post('/api/v1/login', (req, res) => {
    const { username, password, hwid } = req.body;
    
    console.log(`[Accounts] Intento de login: ${username} | HWID: ${hwid}`);

    // Simulamos validación de Nexo Network
    if (username && hwid) {
        res.json({
            token: "NEXO_SESSION_" + Math.random().toString(36).substr(2),
            user_id: 1,
            username: username,
            hwid_verified: true
        });
    } else {
        res.status(401).json({ error: "Credenciales o HWID no válidos" });
    }
});

module.exports = router;