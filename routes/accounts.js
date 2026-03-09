const express = require('express');
const router = express.Router();

// El emulador hace un GET para validar el ID
router.get('/account_id', (req, res) => {
    // Formato real: 0x seguido de 16 caracteres hexadecimales
    res.send("0x0000000000000001"); 
});

// El login real devuelve un objeto con el token y el perfil
router.post('/login', (req, res) => {
    res.json({
        token: "session_a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2",
        user_id: "0x0000000000000001",
        username: "Jous",
        environment: "production",
        permissions: ["all"],
        created_at: "2024-01-01T00:00:00Z"
    });
});

module.exports = router;