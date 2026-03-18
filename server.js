require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');

const app = express();

// --- CONFIGURACIÓN GLOBAL ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. CONFIGURACIÓN DEL BACKEND (API) ---
const accountsRouter = require('./routes/accounts');
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());
apiApp.use(accountsRouter);

// Subdominio para la API
app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));

// --- 2. CONFIGURACIÓN DEL FRONTEND (WEB) ---
// Apuntamos a la carpeta donde tienes tus archivos .html
const frontendPath = path.join(__dirname, '../nexonetwork.space'); 
app.use(express.static(frontendPath));

// Si entran a la IP/Dominio sin subdominio, cargamos la web
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- MANEJO DE ERRORES ---
process.on('uncaughtException', (err) => {
    console.error('⚠️ Error inesperado:', err.message);
});

// --- INICIO DEL SERVIDOR EN PUERTO 4000 ---
const PORT = 4000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log('🚀 NeXO NETWORK - MODO DEFINITIVO');
    console.log(`📡 Puerto Fijo: ${PORT}`);
    console.log(`🏠 Web Local: http://localhost:${PORT}`);
    console.log(`🔗 API Subdomain: accounts-api-lp1.nexonetwork.space`);
    console.log('==================================================');
});

// Verificación de puerto ocupado
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} está ocupado. Ejecuta: fuser -k ${PORT}/tcp`);
    }
    process.exit(1);
});