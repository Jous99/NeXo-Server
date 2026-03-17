const express = require('express');
const router = express.Router();

// Ruta: friends-lp1.nexonetwork.space/api/v1/friends
router.get('/api/v1/friends', (req, res) => {
    res.json({
        friends: [],
        requests: 0,
        online_friends: 0
    });
});

module.exports = router;