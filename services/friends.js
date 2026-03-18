const express = require('express');
const router = express.Router();

router.get('/api/v1/friends/list', (req, res) => {
    res.json({
        friends: [],
        requests: 0
    });
});

module.exports = router;