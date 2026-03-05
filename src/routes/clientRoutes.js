const express = require('express');
const router = express.Router();
const db = require('../models');

router.post('/register/redirect', async (req, res) => {
    // Buscamos tu usuario real en la base de datos
    const user = await db.User.findOne({ order: [['createdAt', 'DESC']] });
    
    const pid = user ? user.pid : 243684027;
    const pnm = user ? user.username : "jous";
    const token = "EDEN_AUTH_" + Date.now();

    console.log(`   🚀 [EDEN] Aplicando parche de estructura para: ${pnm}`);

    // Respuesta con "Double-Wrap" (Requerida por RaptorCitrus para validar el login)
    const response = {
        success: true,
        status: "completed",
        token: token,
        session_token: token,
        // Raptor lee de aquí para el perfil
        user: {
            pid: pid,
            pnm: pnm,
            username: pnm,
            region: "EU",
            mapped: true
        },
        // Raptor lee de aquí para la Friend List
        account: {
            pid: pid,
            pnm: pnm,
            nickname: pnm
        },
        redirect_url: "https://accounts-api-lp1.raptor.network/dashboard"
    };

    res.status(200).json(response);
});

// Esta ruta es vital. El emulador la pide justo después de recibir el JSON anterior.
router.get('/me', async (req, res) => {
    const user = await db.User.findOne({ order: [['createdAt', 'DESC']] });
    res.json({
        pid: user ? user.pid : 243684027,
        pnm: user ? user.username : "jous",
        region: "EU"
    });
});

module.exports = router;