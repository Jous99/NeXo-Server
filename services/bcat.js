const express = require('express');
const router = express.Router();

router.get('/notices', (req, res) => {
    res.json({
        notices: [
            {
                id: 1,
                title: "Nexo Network Alpha",
                message: "Bienvenido al proyecto de preservación online.",
                image_url: "https://nexonetwork.space/logo.png"
            }
        ]
    });
});

module.exports = router;