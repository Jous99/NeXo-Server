const express = require('express');
const router = express.Router();

// --- CONFIGURACIÓN DE TÍTULOS (JUEGOS) ---
// Aquí puedes añadir todos los IDs de los juegos que quieras soportar
const nexoTitles = [
    {
        "title_id": "01007ef00011e000",
        "name": "The Legend of Zelda: Breath of the Wild",
        "status": "online",
        "version_required": "1.6.0",
        "features": ["online_save", "multiplayer"]
    },
    {
        "title_id": "0100000000010000",
        "name": "Super Mario Odyssey",
        "status": "online",
        "version_required": "1.3.0"
    },
    {
        "title_id": "010015100b514000",
        "name": "Animal Crossing: New Horizons",
        "status": "maintenance",
        "message": "Servidores en mantenimiento hasta las 20:00 UTC"
    }
];

// --- ENDPOINTS QUE BUSCA EL EMULADOR ---

// 1. Obtener la lista de títulos disponibles
router.get('/api/v1/titles', (req, res) => {
    console.log('[Config] Enviando lista de títulos a:', req.ip);
    res.json(nexoTitles);
});

// 2. Obtener configuración global del servidor
router.get('/api/v1/status', (req, res) => {
    res.json({
        "server_name": "NeXo Network Server",
        "version": "1.0.0",
        "motd": "¡Bienvenido a NeXo Network! Disfruta del juego online.",
        "maintenance": false
    });
});

// 3. Endpoint específico para un título
router.get('/api/v1/titles/:titleId', (req, res) => {
    const title = nexoTitles.find(t => t.title_id === req.params.titleId);
    if (title) {
        res.json(title);
    } else {
        res.status(404).json({ error: "Título no encontrado en NeXo" });
    }
});

module.exports = router;