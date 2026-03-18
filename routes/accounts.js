const express = require('express');
const router = express.Router();
const accountService = require('../services/accounts');
const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento de fotos
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Endpoint de Login y Perfil (los mismos de antes...)
router.get('/v1/profile/:id', async (req, res) => {
    try {
        const result = await accountService.getProfile(req.params.id);
        res.json({ status: "success", data: result });
    } catch (e) { res.status(500).json({ status: "error", message: e.message }); }
});

// NUEVO: Ruta para actualizar con FOTO
router.post('/v1/profile/update', upload.single('avatar'), async (req, res) => {
    try {
        const data = {
            nexo_id: req.body.nexo_id,
            nickname: req.body.nickname,
            currentPassword: req.body.currentPassword,
            newPassword: req.body.newPassword,
            avatar_url: req.file ? `/uploads/${req.file.filename}` : null
        };
        const result = await accountService.updateProfile(data.nexo_id, data);
        res.json({ status: "success", data: result });
    } catch (e) { res.status(400).json({ status: "error", message: e.message }); }
});

module.exports = router;