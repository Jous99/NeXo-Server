const express = require('express');
const router = express.Router();
const db = require('./db'); // Asegúrate de que db.js esté en la misma carpeta

// Ruta: accounts-api-lp1.nexonetwork.space/api/v1/login
router.post('/api/v1/login', async (req, res) => {
    const { hardware_id, username } = req.body;
    
    console.log(`[LOGIN] Intento de HWID: ${hardware_id}`);

    try {
        // 1. Verificar si el usuario existe
        const [users] = await db.execute('SELECT * FROM users WHERE hardware_id = ?', [hardware_id]);

        let user;
        if (users.length === 0) {
            // 2. Si no existe, crearlo
            const [result] = await db.execute(
                'INSERT INTO users (username, hardware_id) VALUES (?, ?)', 
                [username || `Player_${Math.floor(Math.random()*999)}`, hardware_id]
            );
            user = { id: result.insertId, username };
            console.log(`[DB] Nuevo usuario registrado: ${user.username}`);
        } else {
            user = users[0];
            console.log(`[DB] Login exitoso: ${user.username}`);
        }

        // 3. Responder al emulador
        res.json({
            status: "success",
            user_id: user.id,
            token: "nexo_token_" + Math.random().toString(36).substr(2)
        });

    } catch (err) {
        console.error("--- ERROR EN BASE DE DATOS ---");
        console.error(err.message);
        res.status(500).json({ error: "Internal Server Error", detail: err.message });
    }
});

module.exports = router;