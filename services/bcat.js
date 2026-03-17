const express = require('express');
const router = express.Router();

// Endpoint: GET /notices (O el que defina boxcat.cpp)
router.get('/notices', (req, res) => {
    res.json({
        notices: [
            {
                title: "Bienvenido a Nexo Network",
                content: "Los servidores están actualmente en desarrollo.",
                date: new Date().toISOString()
            }
        ]
    });
});

module.exports = router;