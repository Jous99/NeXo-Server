const express = require('express');
const vhost = require('vhost');
const app = express();

// Importar los servicios
const accounts = require('./services/accounts');
const config = require('./services/config');
const bcat = require('./services/bcat');

app.use(express.json());

// Mapeo de subdominios exactos
app.use(vhost('accounts-api-lp1.nexonetwork.space', accounts));
app.use(vhost('config-lp1.nexonetwork.space', config));
app.use(vhost('bcat-lp1.nexonetwork.space', bcat));

// Puerto de escucha (Interno, luego Nginx hará el Bridge a 443)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Nexo Network] Servidor corriendo en puerto ${PORT}`);
    console.log(`[Nexo Network] Escuchando subdominios *-lp1.nexonetwork.space`);
});