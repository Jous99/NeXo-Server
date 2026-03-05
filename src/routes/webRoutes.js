const express = require('express'); // IMPORTANTE: Falta esto
const router = express.Router();    // IMPORTANTE: Falta esto
const db = require('../models');

// POST /api/v1/web/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = await db.User.findOne({ where: { username, password } });

        if (user) {
            // ✅ GENERACIÓN DE PID Y FC SI NO EXISTEN (Imagen 8 corregida)
            if (!user.pid || !user.friend_code) {
                user.pid = Math.floor(100000000 + Math.random() * 900000000);
                const parts = Array.from({ length: 3 }, () => Math.floor(1000 + Math.random() * 9000));
                user.friend_code = parts.join('-');
                await user.save(); // Guardamos los nuevos datos en XAMPP
            }

            console.log(`✅ [LOGIN] ${username} entró a Eden Network`);
            res.json({ 
                success: true, 
                redirect: "/dashboard",
                user: {
                    username: user.username,
                    pid: user.pid,
                    friend_code: user.friend_code,
                    role: user.role || 'user'
                }
            });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    } catch (e) {
        console.error("❌ Error en webRoutes:", e.message);
        res.status(500).json({ success: false, message: "Error interno" });
    }
});

module.exports = router; // Siempre exportar al final