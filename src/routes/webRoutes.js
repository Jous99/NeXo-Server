const express = require('express');
const router = express.Router();
const db = require('../models');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`   👤 [WEB] Intento de login: ${username}`);

        const user = await db.User.findOne({ where: { username, password } });

        if (user) {
            // Sincronizamos con el emulador guardando al usuario en el núcleo global
            global.lastLoggedUser = {
                pid: user.pid || 100000001,
                pnm: user.username,
                token: "EDEN_" + Math.random().toString(36).substr(2, 12).toUpperCase()
            };
            
            console.log(`   ✅ [WEB] Login exitoso: ${user.username}`);
            return res.json({ success: true });
        } else {
            return res.status(401).json({ success: false, message: "Datos incorrectos" });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: "Error interno" });
    }
});

module.exports = router;