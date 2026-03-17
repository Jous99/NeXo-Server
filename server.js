const express = require('express');
const app = express();

app.use(express.json());

// 1. Emulación de Configuración (Game List & Titles)
// Referencia: src/yuzu/game_list.cpp -> /api/v1/titles
const configApp = express();
configApp.get('/api/v1/titles', (req, res) => {
    res.json([
        { title_id: "0100000000010000", name: "Super Mario Odyssey", version: "1.3.0" },
        // Aquí irán los juegos compatibles con NeXo
    ]);
});

// 2. Emulación de Cuentas (Login)
// Referencia: src/yuzu/online/monitor.cpp
const accountsApp = express();
accountsApp.post('/api/v1/login', (req, res) => {
    console.log("Intento de login recibido del emulador");
    res.status(200).json({
        token: "nexo_token_secure_xyz",
        user: { id: 1, username: "NexoUser" }
    });
});

// 3. Sistema de Amigos y Presencia
const friendsApp = express();
friendsApp.get('/api/v1/friends', (req, res) => {
    res.json({ friends: [] });
});

// Lógica de enrutamiento por subdominio
app.use((req, res, next) => {
    const host = req.headers.host;
    if (host.startsWith('config-lp1')) return configApp(req, res, next);
    if (host.startsWith('accounts-api-lp1')) return accountsApp(req, res, next);
    if (host.startsWith('friends-lp1')) return friendsApp(req, res, next);
    next();
});

app.listen(80, () => {
    console.log("NeXo Network Server activo en puerto 80");
});