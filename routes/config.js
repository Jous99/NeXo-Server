const express = require('express');
const router = express.Router();

// Información del servicio
router.get('/', (req, res) => {
    res.json({
        status: "online",
        service: "NeXo Config Service (lp1)",
        version: "0.0.1",
        message: "System Configuration & Environment Provider"
    });
});

// Endpoint de configuración global
router.get('/v1/config', (req, res) => {
    try {
        res.json({
            status: "success",
            version: "0.0.1",
            data: {
                environment: "production",
                region: "EU",
                nso_features: {
                    cloud_saves: true,
                    online_play: true,
                    voice_chat: false
                },
                server_time: Date.now()
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Internal Config Error" });
    }
});

module.exports = router;