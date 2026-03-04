const express = require('express');
const router = express.Router();
const db = require('../models/index');

// --- 1. FUNCIÓN MAESTRA DE REDIRECCIÓN ---
// Esta respuesta le dice al emulador: "No abras el navegador, usa tus propios campos de login"
const sendUnlockResponse = (req, res) => {
    console.log(`\n[${new Date().toLocaleTimeString()}] 🔓 DESBLOQUEANDO EMULADOR (${req.method})`);
    res.status(200).json({
        success: true,
        status: "success",
        code: 200,
        data: {
            redirect: false,        // ¡Crucial! Para que no abra webs externas
            url: "",                // Vacío para que se quede en el cliente
            action: "login",        // Indica que la acción siguiente es loguearse
            method: "internal",     // Fuerza el uso del formulario del emulador
            skip_verify: true,      // Evita verificaciones de seguridad extras
            maintenance: false      // Asegura que el servidor "está abierto"
        }
    });
};

// Atendemos ambas posibilidades (GET y POST) para la misma ruta
router.post('/register/redirect', sendUnlockResponse);
router.get('/register/redirect', sendUnlockResponse);

// --- 2. ESTADO DE SUSCRIPCIÓN ---
router.get('/subscription', (req, res) => {
    console.log("💎 [SUBSCRIPTION] Validando cuenta premium en Eden Network.");
    res.status(200).json({
        success: true,
        status: "success",
        data: {
            active: true,
            type: "lifetime",
            status: "active",
            expires_at: "2099-12-31 23:59:59"
        }
    });
});

// --- 3. PERFIL DE USUARIO ---
router.get('/profile', (req, res) => {
    console.log("👤 [PROFILE] Enviando datos de identidad al emulador.");
    res.status(200).json({
        success: true,
        status: "success",
        data: {
            user_id: 1,
            username: "EdenPlayer",
            nickname: "EdenPlayer",
            level: 99,
            is_verified: true
        }
    });
});

// --- 4. LÓGICA DE LOGIN ---
router.post('/login', async (req, res) => {
    try {
        // Detectamos automáticamente si el emulador envía 'username' o 'login'
        const username = req.body.username || req.body.login || req.body.user;
        const password = req.body.password || req.body.pass;

        console.log(`🔑 [INTENTO LOGIN] Usuario: ${username}`);

        const user = await db.User.findOne({ where: { username: username } });

        if (!user || user.password !== password) {
            console.log("❌ [LOGIN FALLIDO] Credenciales incorrectas.");
            return res.status(401).json({ success: false, message: "Error de autenticación" });
        }

        console.log(`✅ [LOGIN EXITOSO] Bienvenida, ${user.username}`);
        res.status(200).json({
            success: true,
            status: "success",
            token: "eden_auth_" + Buffer.from(username).toString('base64'),
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error("❌ [ERROR CRÍTICO LOGIN]:", error.message);
        res.status(500).json({ success: false, message: "Error interno" });
    }
});

module.exports = router;