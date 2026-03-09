const express = require('express');
const morgan = require('morgan');
const path = require('path');
const app = express();
const PORT = 3000;

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log detallado: nos dirá el dominio (Host) que envía el aaPanel
app.use(morgan(':method :host :url :status - :response-time ms'));
morgan.token('host', (req) => req.hostname);

// Cabeceras de compatibilidad con Raptor/Nexo
app.use((req, res, next) => {
    res.header("Content-Type", "application/json; charset=utf-8");
    res.header("Server", "Raptor-Network-Emulator");
    res.header("X-Powered-By", "NeXo-Backend");
    next();
});

// --- IMPORTACIÓN DE RUTAS (API MODULES) ---
// Asegúrate de que estos archivos existan en la carpeta /routes/
const accounts = require('./routes/accounts');
const config   = require('./routes/config');
const profile  = require('./routes/profile');
const status   = require('./routes/status');

// --- MAPEADO DE RUTAS ---
// Mapeamos según los subdirectorios y la estructura real de la API
app.use('/api/v1/client', accounts); // Login y ID
app.use('/api/v1/client', profile);  // Suscripción y Perfil
app.use('/api/v1', config);          // Services y Rewrites
app.use('/api/v1', status);          // Notifications y Status

// --- MANEJO DE RUTAS NO ENCONTRADAS ---
app.use((req, res) => {
    console.log(`⚠️  Ruta desconocida solicitada: ${req.hostname}${req.path}`);
    res.status(404).json({ error: "Endpoint not found in NeXo Server" });
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    =============================================
    🚀 NEXO MODULAR SERVER ONLINE
    =============================================
    Puerto:    ${PORT}
    IP Local:  192.168.0.198
    IP Panel:  192.168.0.200
    ---------------------------------------------
    Esperando peticiones de Raptor Network...
    `);
});