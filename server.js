require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');

const app = express();

// Configuración Global
app.use(cors()); // Permite peticiones desde nexonetwork.space
app.use(express.json()); // Permite leer JSON en el body de las peticiones

// --- IMPORTACIÓN DE RUTAS ---
const accountsRouter = require('./routes/accounts');

// Validación para evitar el error "argument handler must be a function"
if (typeof accountsRouter !== 'function') {
    console.error('❌ ERROR: routes/accounts.js no está exportando el router correctamente.');
    process.exit(1);
}

// --- CONFIGURACIÓN DE SUBDOMINIOS (VHOST) ---
// Esto hace que la API responda solo en ese subdominio específico
app.use(vhost('accounts-api-lp1.nexonetwork.space', accountsRouter));

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo salió mal en el servidor de NeXo!');
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log('--------------------------------------------------');
    console.log(`🚀 NeXo Network Backend activo`);
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🔗 API: https://accounts-api-lp1.nexonetwork.space`);
    console.log('--------------------------------------------------');
});