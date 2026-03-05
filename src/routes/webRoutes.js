const express = require('express');
const router = express.Router();
const db = require('../models');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = await db.User.findOne({ where: { username, password } });

        if (user) {
            // Generar PID y Friend Code si no los tiene
            if (!user.pid || !user.friend_code) {
                user.pid = Math.floor(100000000 + Math.random() * 900000000);
                const p = () => Math.floor(1000 + Math.random() * 9000);
                user.friend_code = `${p()}-${p()}-${p()}`;
                await user.save();
            }
            res.json({ success: true, redirect: "/dashboard", user });
        } else {
            res.status(401).json({ success: false, message: "Datos incorrectos" });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;