const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Ruta para el formulario de registro (POST)
router.post('/register', userController.webRegister);

// Ruta para el formulario de login (POST)
router.post('/login', userController.webLogin);

// Ruta para obtener los datos del perfil en el Dashboard (GET)
router.get('/user/profile', userController.getProfile);

module.exports = router;