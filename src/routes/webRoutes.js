const express = require('express');
const router = express.Router();
const db = require('../models');

// POST /api/v1/web/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Verificación de seguridad para evitar que 'db' sea undefined
        if (!db || !db.User) {
            throw new Error("La base de datos o el modelo User no están cargados correctamente.");
        }

        const user = await db.User.findOne({ where: { username, password } });
        
        if (user) {
            console.log(`✅ [WEB] Login exitoso para: ${username}`);
            res.json({ success: true, message: "Bienvenido a Eden Network", user });
        } else {
            res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos" });
        }
    } catch (e) {
        // Esto aparecerá en tu terminal negra para que sepas el error real
        console.error("❌ [ERROR INTERNO WEB]:", e.message);
        res.status(500).json({ success: false, message: "Error interno: " + e.message });
    }
});

module.exports = router;