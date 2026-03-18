cat <<EOF > server.js
const express = require('express');
const vhost = require('vhost');
require('dotenv').config();

const app = express();
app.use(express.json());

const nexoAccounts = require('./services/nexo_accounts');
const nexoConfig = require('./services/nexo_config');

const DOMAIN = 'nexonetwork.space';

// Mapeo de subdominios
app.use(vhost(\`accounts-api-lp1.\${DOMAIN}\`, nexoAccounts));
app.use(vhost(\`config-lp1.\${DOMAIN}\`, nexoConfig));

app.get('/', (req, res) => res.send('NeXo Network Backend Online en Puerto 4000'));

// CAMBIAMOS AL PUERTO 4000
const PORT = 4000;
app.listen(PORT, () => console.log('Servidor NeXo corriendo en puerto ' + PORT));
EOF