const express = require('express');
const router = express.Router();
const accountService = require('../services/accounts');

router.post('/v1/login', async (req, res) => {
    try {
        const result = await accountService.authenticate(req.body.username, req.body.password);
        res.json({ status: "success", data: result });
    } catch (e) { res.status(401).json({ status: "error", message: e.message }); }
});

router.get('/v1/profile/:id', async (req, res) => {
    try {
        const result = await accountService.getProfile(req.params.id);
        res.json({ status: "success", data: result });
    } catch (e) { res.status(500).json({ status: "error", message: e.message }); }
});

router.post('/v1/profile/update', async (req, res) => {
    try {
        const result = await accountService.updateProfile(req.body.nexo_id, req.body);
        res.json({ status: "success", data: result });
    } catch (e) { res.status(400).json({ status: "error", message: e.message }); }
});

module.exports = router;