const express = require('express');
const router = express.Router();
const accountService = require('../services/accounts');
const multer = require('multer');
const path = require('path');

// Configurar dónde y cómo se guardan las fotos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/')); // Ruta absoluta a la carpeta uploads
    },
    filename: (req, file, cb) => {
        // Nombre único: ID de usuario + timestamp
        const userId = req.body.nexo_id || 'unknown';
        cb(null, `avatar-${userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite 5MB
});

// RUTA DE ACTUALIZACIÓN (IMPORTANTE: upload.single('avatar'))
router.post('/v1/profile/update', upload.single('avatar'), async (req, res) => {
    try {
        const data = {
            nickname: req.body.nickname,
            currentPassword: req.body.currentPassword,
            newPassword: req.body.newPassword,
            // Si Multer guardó el archivo, generamos la URL pública
            avatar_url: req.file ? `/uploads/${req.file.filename}` : null
        };

        const result = await accountService.updateProfile(req.body.nexo_id, data);
        res.json({ status: "success", message: "Perfil actualizado", data: result });
    } catch (e) {
        console.error("Error en update:", e);
        res.status(400).json({ status: "error", message: e.message });
    }
});

module.exports = router;