const express = require('express');
const vhost = require('vhost');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware para entender JSON (necesario para los POST del emulador)
app.use(express.json());

// Importar la lógica de los servicios
const nexoAccounts = require('./services/nexo_accounts');
const nexoConfig = require('./services/nexo_config');

const DOMAIN = 'nexonetwork.space';

// --- CONFIGURACIÓN DE SUBDOMINIOS (VHOSTS) ---

// 1. Servicio de Cuentas (accounts-api-lp1.nexonetwork.space)
app.use(vhost('accounts-api-lp1.' + DOMAIN, nexoAccounts));

// 2. Servicio de Configuración y Títulos (config-lp1.nexonetwork.space)
app.use(vhost('config-lp1.' + DOMAIN, nexoConfig));

// 3. Otros servicios (puedes apuntarlos al mismo o crear nuevos archivos)
app.use(vhost('profile-lp1.' + DOMAIN, nexoAccounts));
app.use(vhost('bcat-lp1.' + DOMAIN, nexoConfig));

// --- RUTA POR DEFECTO (Para pruebas en el navegador) ---
app.get('/', (req, res) => {
    res.status(200).send('<h1>NeXo Network Backend</h1><p>Estado: ONLINE | Puerto: 4000</p>');
});

// --- LANZAMIENTO DEL SERVIDOR ---
const PORT = 4000;
app.listen(PORT, () => {
    console.log('====================================');
    console.log('   NEXO NETWORK SERVER ONLINE       ');
    console.log('   Puerto: ' + PORT                 );
    console.log('   Dominio: ' + DOMAIN              );
    console.log('====================================');
});