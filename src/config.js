const express = require('express');
const router = express.Router();

// Ruta: config-lp1.nexonetwork.space/api/v1/titles
router.get('/api/v1/titles', (req, res) => {
    res.json([
        { title_id: "0100000000010000", name: "System Menu" },
        { title_id: "01007ef00011e000", name: "Breath of the Wild" }
    ]);
});

// Ruta: config-lp1.nexonetwork.space/api/v1/status
router.get('/api/v1/status', (req, res) => {
    res.json({
        server_status: "online",
        maintenance: false,
        min_emulator_version: "1.0.0"
    });
});

module.exports = router;