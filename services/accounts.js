const express = require('express');
const router = express.Router();

// Esto es para que TÚ veas que funciona en el navegador
router.get('/api/v1/login', (req, res) => {
    res.send('✅ Servicio de Cuentas NeXo funcionando (GET OK)');
});

// Esto es lo que usa el EMULADOR
router.post('/api/v1/login', (req, res) => {
    console.log('--- LOGIN RECIBIDO ---', req.body);
    res.json({
        status: "success",
        token: "NEXO_OK_" + Date.now(),
        user_id: 1,
        permissions: ["online_play"]
    });
});

module.exports = router;