const express = require('express');
const router = express.Router();
const db = require('../database');

// Login y registro de Hardware ID
router.post('/api/v1/login', async (req, res) => {
    const { username, password, hwid } = req.body;
    
    try {
        // Buscamos si el HWID está registrado o baneado
        const [rows] = await db.execute('SELECT * FROM users WHERE hwid = ?', [hwid]);
        
        if (rows.length === 0) {
            // Si es nuevo, podrías registrarlo automáticamente o pedir registro
            return res.status(401).json({ error: "Dispositivo no registrado en Nexo" });
        }

        res.json({
            token: "NEXO_TOKEN_" + Date.now(),
            username: rows[0].username,
            status: "success"
        });
    } catch (err) {
        res.status(500).json({ error: "Error de servidor" });
    }
});

module.exports = router;