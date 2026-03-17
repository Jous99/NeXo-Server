const express = require('express');
const app = express();
require('dotenv').config();

const accountsRouter = require('./src/accounts');
const configRouter = require('./src/config');
const friendsRouter = require('./src/friends');

app.use(express.json());

// Log para debuguear en tiempo real
app.use((req, res, next) => {
    const host = req.headers.host || '';
    console.log(`[PETICIÓN] Host detectado: ${host} | Ruta: ${req.url}`);
    next();
});

// Lógica de enrutamiento por subdominio corregida
app.use((req, res, next) => {
    const host = req.headers.host || '';

    // Usamos .includes para ignorar si viene con puerto o no
    if (host.includes('accounts-api-lp1')) {
        return accountsRouter(req, res, next);
    } 
    else if (host.includes('config-lp1')) {
        return configRouter(req, res, next);
    } 
    else if (host.includes('friends-lp1')) {
        return friendsRouter(req, res, next);
    }

    next();
});

// Respuesta por defecto si no entra en ningún subdominio
app.use((req, res) => {
    res.status(404).json({
        error: "Subdominio no reconocido por NeXo Network",
        host_recibido: req.headers.host
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`--- NeXo Network ONLINE ---`);
    console.log(`Escuchando en puerto ${PORT}`);
});