const express = require('express');
const router = express.Router();
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../models');

const EDEN_SECRET = "EDEN_CORE_SYSTEM_2026";

// --- SOLUCIÓN "CANNOT GET" (Navegador) ---

// Para la Imagen 1: /api/v1/client/register
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/register.html'));
});

// Para la Imagen 2: /api/v1/client/register/redirect
router.get('/register/redirect', (req, res) => {
    res.redirect('/api/v1/client/register');
});

// Para la Imagen 3: /api/v1/client/login.html o /api/v1/client/login
router.get(['/login', '/login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

// --- RUTA PARA EL EMULADOR (POST) ---
router.post('/register/redirect', (req, res) => {
    res.json({ success: true, data: { redirect: false, action: "login", network: "Eden Network" } });
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.User.findOne({ where: { username, password } });
        if (!user) return res.status(401).json({ success: false, message: "Error en Eden" });
        
        const token = jwt.sign({ id: user.id, pid: user.pid }, EDEN_SECRET);
        res.json({ success: true, data: { token, user: { pid: user.pid, username: user.username } } });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;