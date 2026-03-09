const express = require('express');
const router = express.Router();

// Información detallada de la suscripción y el usuario
router.get('/subscription', (req, res) => {
    res.json({
        display_subscription: "Nexo Ultimate Plan",
        enable_set_username: true,
        enable_set_profile: true,
        is_trial: false,
        expires_at: "2030-01-01T00:00:00Z"
    });
});

// Ajustes del cliente
router.get('/settings', (req, res) => {
    res.json({
        language: "es-ES",
        theme: "dark",
        notifications_enabled: true
    });
});

module.exports = router;