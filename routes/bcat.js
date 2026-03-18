const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        status: "online",
        service: "NeXo BCAT Delivery (lp1)",
        version: "0.0.1"
    });
});

// Noticias del sistema (News Feed)
router.get('/v1/news', (req, res) => {
    res.json({
        status: "success",
        version: "0.0.1",
        data: [
            {
                id: 101,
                title: "Bienvenido a NeXo Network",
                content: "Los servidores experimentales v0.0.1 ya están en línea.",
                image: "/assets/news/welcome.png",
                date: new Date()
            },
            {
                id: 102,
                title: "Mantenimiento de Base de Datos",
                content: "Migración a MySQL completada con éxito.",
                image: "/assets/news/db_update.png",
                date: new Date()
            }
        ]
    });
});

module.exports = router;