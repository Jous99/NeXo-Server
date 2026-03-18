const express = require('express');
const vhost = require('vhost');
require('dotenv').config();

const app = express();
app.use(express.json());

// Importamos los archivos EXACTOS de tu captura
const accounts = require('./services/accounts');
const bcat = require('./services/bcat');
const config = require('./services/config');
const friends = require('./services/friends');

const DOMAIN = 'nexonetwork.space';

// --- RUTAS DE SUBDOMINIOS ---
app.use(vhost('accounts-api-lp1.' + DOMAIN, accounts));
app.use(vhost('config-lp1.' + DOMAIN, config));
app.use(vhost('bcat-lp1.' + DOMAIN, bcat));
app.use(vhost('friends-lp1.' + DOMAIN, friends));
app.use(vhost('profile-lp1.' + DOMAIN, accounts));

// Ruta base para test
app.get('/', (req, res) => {
    res.send('<h1>NeXo Network</h1><p>Servidor activo en puerto 4000</p>');
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log('--- NeXo Network Server Online ---');
    console.log('Puerto: ' + PORT);
    console.log('Servicios cargados: accounts, bcat, config, friends');
});