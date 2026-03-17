const express = require('express');
const router = express.Router();

router.get('/api/v1/titles', (req, res) => {
    // Aquí defines qué juegos quieres que aparezcan con soporte Nexo
    res.json([
        {
            "title_id": "01007ef00011e000",
            "name": "Zelda: BotW (Nexo)",
            "online": true
        },
        {
            "title_id": "0100000000010000",
            "name": "Super Mario Odyssey",
            "online": true
        }
    ]);
});

module.exports = router;