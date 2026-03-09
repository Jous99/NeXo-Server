const express = require('express');
const router = express.Router();

// Estado general del servidor
router.get('/status', (req, res) => {
    res.json({
        online: true,
        server_time: new Date().toISOString(),
        load: "low"
    });
});

// Notificaciones que aparecen en el emulador
router.get('/notifications', (req, res) => {
    res.json([
        {
            id: 1,
            title: "Servidor Nexo Local",
            message: "Conectado con éxito al backend de Jous.",
            type: "info"
        }
    ]);
});

module.exports = router;