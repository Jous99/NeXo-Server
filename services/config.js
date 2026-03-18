const express = require('express');
const router = express.Router();

router.get('/api/v1/titles', (req, res) => {
    res.json([
        {
            "title_id": "01007ef00011e000",
            "name": "Zelda: BotW (NeXo Online)",
            "status": "online",
            "server_ip": "nexonetwork.space"
        },
        {
            "title_id": "0100000000010000",
            "name": "Super Mario Odyssey",
            "status": "online"
        }
    ]);
});

module.exports = router;