const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    res.json({
        status: "online",
        service: "NeXo Friends Server (lp1)",
        version: "0.0.1"
    });
});

// Obtener lista de amigos (Placeholder para v0.0.1)
router.get('/v1/friends/list', async (req, res) => {
    try {
        // En v0.0.2 implementaremos la verificación de JWT aquí
        res.json({
            status: "success",
            version: "0.0.1",
            data: {
                friends: [],
                pending_requests: 0
            }
        });
    } catch (error) {
        res.status(500).json({ status: "error", error_code: "FRIENDS_LIST_ERROR" });
    }
});

// Buscar usuario por Nexo ID para añadirlo
router.get('/v1/friends/search/:nexoId', async (req, res) => {
    try {
        const [user] = await db.execute(
            'SELECT nickname, avatar_url, online_status FROM users WHERE nexo_id = ?',
            [req.params.nexoId]
        );
        
        if (user.length === 0) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }
        
        res.json({ status: "success", data: user[0] });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Database lookup failed" });
    }
});

module.exports = router;