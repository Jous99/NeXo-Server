const express = require('express');
const router = express.Router();
const db = require('../models/index');

// --- 1. REDIRECCIÓN ---
const handleRedirect = (req, res) => {
    console.log(`🔄 [REDIRECT] Respondiendo a consulta (${req.method})`);
    res.status(200).json({
        success: true,
        status: "success",
        data: { redirect: false, url: "" }
    });
};
router.post('/register/redirect', handleRedirect);
router.get('/register/redirect', handleRedirect);

// --- 2. PERFIL DE USUARIO (La que daba 404) ---
router.get('/profile', (req, res) => {
    console.log("👤 [PROFILE] El emulador solicita datos del perfil.");
    res.status(200).json({
        success: true,
        status: "success",
        data: {
            user_id: 1,
            username: "EdenPlayer",
            nickname: "EdenPlayer",
            email: "admin@eden-network.com",
            level: 1,
            points: 1000,
            is_verified: true
        }
    });
});

// --- 3. SUSCRIPCIÓN ---
router.get('/subscription', (req, res) => {
    console.log("💎 [SUBSCRIPTION] Verificando estado de cuenta.");
    res.status(200).json({
        success: true,
        status: "success",
        data: { active: true, type: "lifetime", expires_at: "2099-12-31 23:59:59" }
    });
});

// --- 4. LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.User.findOne({ where: { username } });

        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: "Error" });
        }

        console.log(`✅ [LOGIN EXITOSO] ${user.username}`);
        res.status(200).json({
            success: true,
            status: "success",
            data: {
                token: "eden_tk_" + Buffer.from(username).toString('base64'),
                user: { id: user.id, username: user.username }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;