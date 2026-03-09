const express = require('express');
const router = express.Router();

router.get('/rewrites', (req, res) => {
    // Raptor usa esto para redirigir tráfico interno
    res.json([
        {
            "pattern": ".*\\.raptor\\.network",
            "replacement": "192.168.0.200", // La IP de tu aaPanel
            "type": "dns"
        }
    ]);
});

router.get('/services', (req, res) => {
    res.json({
        "services": {
            "accounts": "https://accounts-api-lp1.raptor.network",
            "friends": "https://friends-lp1.raptor.network",
            "status": "https://status-lp1.raptor.network",
            "storage": "https://storage-lp1.raptor.network"
        },
        "version": "1.5.0",
        "min_client_version": "1.0.0"
    });
});

module.exports = router;