const express = require('express');
const router = express.Router();

// Middleware para loguear peticiones de la consola
router.use((req, res, next) => {
    console.log(`[ACCOUNTS] ${req.method} ${req.url}`);
    next();
});

// Endpoint: Obtener información del servidor de cuentas
router.get('/v1/api/provider/info', (req, res) => {
    res.json({
        provider_name: "NeXoServer",
        status: "UP",
        region: "EU"
    });
});

// Endpoint: Login (Simulado para que la consola no de error)
router.post('/v1/api/auth/login', (req, res) => {
    // Aquí es donde en el futuro conectarás con tu Base de Datos
    res.json({
        token: "nexo_session_token_example_12345",
        user_id: "00000001",
        nickname: "NexoUser"
    });
});

// Endpoint para el "Mii" o perfil
router.get('/v1/api/mii', (req, res) => {
    res.json({
        mii_data: "base64_mii_data_here",
        user_id: "00000001"
    });
});

module.exports = router;