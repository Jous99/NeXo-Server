const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN INICIAL ---
app.use(cors()); // Permite que tu web externa lea el estado
app.use(express.json());

const DOMAIN = 'nexonetwork.space';

// --- RUTA DE SALUD (ESTO ARREGLA EL "CANNOT GET /HEALTH") ---
// Esta ruta responde a nexonetwork.space/health o a la IP directamente
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'online', 
        server: 'Nexo-Core-Ubuntu',
        timestamp: new Date().getTime() 
    });
});

// --- IMPORTACIÓN DE SERVICIOS ---
// Asegúrate de que estos archivos existan en la carpeta /services
// Si no existen, comenta estas líneas para que el servidor no de error al arrancar
const accounts = require('./services/accounts');
const config = require('./services/config');
const bcat = require('./services/bcat');
const friends = require('./services/friends');

// --- VINCULACIÓN DE SUBDOMINIOS ---
app.use(vhost('accounts-api-lp1.' + DOMAIN, accounts));
app.use(vhost('config-lp1.' + DOMAIN, config));
app.use(vhost('bcat-lp1.' + DOMAIN, bcat));
app.use(vhost('friends-lp1.' + DOMAIN, friends));
app.use(vhost('profile-lp1.' + DOMAIN, accounts));

// --- RUTA RAIZ ---
app.get('/', (req, res) => {
    res.send('<h1>Nexo Network API</h1><p>El servidor está funcionando correctamente.</p>');
});

// --- ARRANQUE ---
const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('------------------------------------');
    console.log('🚀 NEXO NETWORK ONLINE');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🔗 Dominio: ${DOMAIN}`);
    console.log('------------------------------------');
});