const express = require('express');
const router = express.Router();

// Aquí es donde pondrás lo que descubras en el código del cliente
router.get('/client/account_id', (req, res) => {
    res.send("0x123456789ABCDEF");
});

router.get('/rewrites', (req, res) => {
    res.json([{ source: "nintendo.net", destination: "127.0.0.1" }]);
});

module.exports = router;