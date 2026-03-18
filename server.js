require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;

// --- CARPETAS ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- MIDDLEWARES GLOBALES ---
app.use(cors({ origin: '*' })); // Permite que nexonetwork.space hable con la API
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// --- A. APP DE LA API (SUBDOMINIO) ---
const accountsRouter = require('./routes/accounts');
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());
apiApp.use(accountsRouter); // Tus rutas ya deberían tener el /v1 dentro

// --- B. APP DE LA WEB (DOMINIO PRINCIPAL) ---
const webApp = express();
const frontendPath = path.join(__dirname, '../nexonetwork.space');
webApp.use(express.static(frontendPath));

webApp.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
webApp.get('/profile', (req, res) => res.sendFile(path.join(frontendPath, 'profile.html')));

// --- C. ASIGNACIÓN DE DOMINIOS ---
app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));
app.use(vhost('nexonetwork.space', webApp));
app.use(vhost('www.nexonetwork.space', webApp));

// --- LANZAMIENTO ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 NeXO Network escuchando en nexonetwork.space');
});