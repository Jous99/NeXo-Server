const express = require('express');
const router = express.Router();

// Obtener nombre de usuario
router.get('/username', (req, res) => {
    res.send("Usuario_Eden");
});

// Obtener Avatar (GetAvatar en C++ espera datos de imagen)
router.get('/avatar/64/64', (req, res) => {
    // Enviamos un placeholder o una imagen real desde una carpeta
    // res.sendFile(path.join(__dirname, '../../public/avatar.png'));
    res.sendStatus(404); // Si no hay, el C++ lanzará una excepción o usará default
});

module.exports = router;