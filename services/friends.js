const express = require('express');
const router = express.Router();

router.get('/api/v1/friends/presence', (req, res) => {
    res.json({
        online_count: 42,
        friends: [] // Aquí mapearías los usuarios conectados de la DB
    });
});

module.exports = router;