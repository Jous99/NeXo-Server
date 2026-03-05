const express = require('express');
const router = express.Router();

// 1. Handshake de Registro (POST)
router.post('/register/redirect', (req, res) => {
    const hardwareId = req.headers['r-hardwareid'] || 'eden_default';
    
    // Generamos un token alfanumérico puro
    const sessionToken = "EDEN" + Math.random().toString(36).toUpperCase().substring(2, 15);

    console.log(`   🚀 [EDEN] Handshake enviado. Token generado: ${sessionToken}`);

    // Nota: Algunos emuladores fallan si ven objetos anidados complejos. 
    // Enviamos una estructura plana y exitosa.
    res.status(200).json({
        success: true,
        status: "completed",
        token: sessionToken,
        session_token: sessionToken,
        pid: 100000001,
        pnm: "EdenPlayer",
        redirect_url: "https://accounts-api-lp1.raptor.network/dashboard"
    });
});

// 2. Suscripción (Vital para que no reintente el registro)
router.get('/subscription', (req, res) => {
    res.json({
        status: "active",
        type: "premium",
        expires_at: "2099-12-31T23:59:59Z"
    });
});

// 3. Perfil (/me)
router.get('/me', (req, res) => {
    res.json({
        pid: 100000001,
        pnm: "EdenPlayer",
        region: "EU"
    });
});

module.exports = router;