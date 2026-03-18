const express = require('express');
const router = express.Router();
const accountService = require('../services/accounts');

// Raíz del subdominio: GET https://accounts-api-lp1.nexonetwork.space/
router.get('/', (req, res) => {
    res.json({
        status: "online",
        message: "NeXo Network Accounts Service Operational",
        version: "1.0.0"
    });
});

// Registro: POST /v1/register
router.post('/v1/register', async (req, res) => {
    try {
        const result = await accountService.registerUser(req.body);
        res.status(201).json({
            status: "success",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            status: "error",
            message: error.message
        });
    }
});

// Login: POST /v1/login
router.post('/v1/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await accountService.authenticate(username, password);
        res.json({
            status: "success",
            data: result
        });
    } catch (error) {
        res.status(401).json({
            status: "error",
            message: error.message
        });
    }
});

// Perfil: GET /v1/profile/:id
router.get('/v1/profile/:id', async (req, res) => {
    try {
        const result = await accountService.getProfile(req.params.id);
        if (!result) {
            return res.status(404).json({
                status: "error",
                message: "El Nexo ID proporcionado no existe"
            });
        }
        res.json({
            status: "success",
            data: result
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

// MUY IMPORTANTE: Exportar el router para que server.js no de error
module.exports = router;