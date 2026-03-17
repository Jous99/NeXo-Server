const express = require('express');
const vhost = require('vhost');
require('dotenv').config();

const app = express();
app.use(express.json());

// Importar Lógica de Servicios
const accounts = require('./services/accounts');
const config = require('./services/config');
const bcat = require('./services/bcat');
const friends = require('./services/friends');

// --- MAPEADO DE SUBDOMINIOS EXACTOS (Para NexoEmu) ---
const domain = 'nexonetwork.space';

app.use(vhost(`accounts-api-lp1.${domain}`, accounts));
app.use(vhost(`config-lp1.${domain}`, config));
app.use(vhost(`bcat-lp1.${domain}`, bcat));
app.use(vhost(`friends-lp1.${domain}`, friends));
app.use(vhost(`profile-lp1.${domain}`, accounts)); // Perfil suele ir con accounts
app.use(vhost(`status-lp1.${domain}`, (req, res) => res.redirect('https://nexonetwork.space/status.html')));

// Puerto interno (El que pondrás en el Reverse Proxy de aaPanel)
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`[NEXO BACKEND] Online en puerto ${PORT}`);
    console.log(`[INFO] Escuchando subdominios *-lp1.${domain}`);
});