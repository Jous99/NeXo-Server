const express = require('express');
const router = express.Router();
const accountService = require('../services/accounts');

// Middleware para registrar peticiones específicas de este router
router.use((req, res, next) => {
    console.log('--- Account Request ---');
    next();
});

// Endpoint: Registro de Usuario
router.post('/v1/register', async (req, res) => {
    try {
        const result = await accountService.registerUser(req.body);
        res.status(201).json({ status: "success", data: result });
    } catch (error) {
        console.error('Error en registro:', error.message);
        res.status(400).json({ status: "error", message: error.message });
    }
});

// Endpoint: Identificación (Login)
router.post('/v1/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await accountService.authenticate(username, password);
        res.json({ status: "success", data: result });
    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(401).json({ status: "error", message: error.message });
    }
});

// Endpoint: Obtener Perfil por Nexo ID
router.get('/v1/profile/:id', async (req, res) => {
    try {
        const result = await accountService.getProfile(req.params.id);
        if (!result) {
            return res.status(404).json({ status: "error", message: "Usuario no encontrado" });
        }
        res.json({ status: "success", data: result });
    } catch (error) {
        console.error('Error en perfil:', error.message);
        res.status(500).json({ status: "error", message: "Error interno del servidor" });
    }
});

// EXPORTACIÓN OBLIGATORIA
module.exports = router;