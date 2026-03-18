const express = require('express');
const router = express.Router();
const accountService = require('../services/accounts');

// Raíz del subdominio para comprobación rápida
router.get('/', (req, res) => {
    res.json({
        status: "online",
        service: "NeXo Accounts API (lp1)",
        version: "0.0.1",
        message: "Network Authentication System Operational"
    });
});

// --- RUTA AGREGADA PARA EL CLIENTE ---
// Captura la petición de registro/redirección del emulador o consola
router.get('/api/v1/client/register/redirect', (req, res) => {
    res.json({
        status: "success",
        version: "0.0.1",
        action: "redirect",
        target_url: "https://nexonetwork.space/register",
        message: "Redirigiendo al portal de registro de NeXo Network"
    });
});

// 1. RUTA DE REGISTRO: POST /v1/register
router.post('/v1/register', async (req, res) => {
    try {
        const result = await accountService.registerUser(req.body);
        res.status(201).json({
            status: "success",
            version: "0.0.1",
            message: "Usuario NeXo creado correctamente",
            data: {
                nexo_id: result.nexoId
            }
        });
    } catch (error) {
        res.status(400).json({ 
            status: "error", 
            error_code: "REGISTRATION_FAILED",
            message: error.message 
        });
    }
});

// 2. RUTA DE LOGIN: POST /v1/login
router.post('/v1/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const authData = await accountService.authenticate(username, password);
        
        res.json({
            status: "success",
            version: "0.0.1",
            message: "Sesión iniciada en NeXo Network",
            data: authData
        });
    } catch (error) {
        res.status(401).json({ 
            status: "error", 
            error_code: "AUTH_INVALID",
            message: error.message 
        });
    }
});

// 3. RUTA DE PERFIL: GET /v1/profile/:nexoId
router.get('/v1/profile/:nexoId', async (req, res) => {
    try {
        const profile = await accountService.getProfile(req.params.nexoId);
        if (!profile) {
            return res.status(404).json({ 
                status: "error", 
                message: "Nexo ID no encontrado" 
            });
        }
        res.json({
            status: "success",
            version: "0.0.1",
            data: profile
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Error al consultar el perfil" 
        });
    }
});

module.exports = router;