const express = require('express');
const router = express.Router();
const accountService = require('../services/accounts');

// Login
router.post('/v1/login', async (req, res) => {
    try {
        const result = await accountService.authenticate(req.body.username, req.body.password);
        res.json({ status: "success", data: result });
    } catch (e) {
        res.status(401).json({ status: "error", message: e.message });
    }
});

// Ver Perfil
router.get('/v1/profile/:id', async (req, res) => {
    try {
        const result = await accountService.getProfile(req.params.id);
        if (!result) return res.status(404).json({ status: "error", message: "No encontrado" });
        res.json({ status: "success", data: result });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

// Editar Perfil
router.post('/v1/profile/update', async (req, res) => {
    try {
        const { nexo_id, nickname } = req.body;
        const result = await accountService.updateProfile(nexo_id, { nickname });
        res.json({ status: "success", data: result });
    } catch (e) {
        res.status(400).json({ status: "error", message: e.message });
    }
});

module.exports = router;