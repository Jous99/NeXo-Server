const express = require('express');
const router = express.Router();

// Endpoint: GET /api/v1/titles
router.get('/api/v1/titles', (req, res) => {
    const nexoTitles = [
        {
            title_id: "01007ef00011e000",
            name: "The Legend of Zelda: BotW (Nexo Edition)",
            online: true,
            servers: "ONLINE"
        },
        {
            title_id: "0100000000010000",
            name: "Super Mario Odyssey",
            online: true,
            servers: "MAINTENANCE"
        }
    ];
    res.json(nexoTitles);
});

module.exports = router;