require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');

const app = express();

// --- CONFIGURACIÓN GLOBAL ---
app.use(cors());
app.use(express.json());

// --- 1. CONFIGURACIÓN DEL BACKEND (API) ---
const accountsRouter = require('./routes/accounts');

// Crear una aplicación Express separada para la API
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());
apiApp.use(accountsRouter);

// Vincular el subdominio a la aplicación de la API
app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));

// --- 2. CONFIGURACIÓN DEL FRONTEND (WEB PRINCIPAL) ---
// Esto hace que nexonetwork.space sirva tus archivos HTML
const frontendPath = path.join(__dirname, '../nexonetwork.space'); 
app.use(express.static(frontendPath));

// Ruta para que la IP normal o el dominio carguen el index/dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- MANEJO DE ERRORES ---
process.on('uncaughtException', (err) => {
    console.error('❌ Error Crítico:', err);
});

// --- INICIO DEL SERVIDOR EN PUERTO 80 ---
// Usamos el 80 para que no tengas que poner :4000 en la URL
const PORT = 80;
app.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log('🚀 NeXO NETWORK ONLINE');
    console.log(`🏠 Web: http://nexonetwork.space`);
    console.log(`📡 API: https://accounts-api-lp1.nexonetwork.space`);
    console.log(`📂 Carpeta Web: ${frontendPath}`);
    console.log('==================================================');
});