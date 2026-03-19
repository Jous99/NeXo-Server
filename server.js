require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// --- CARPETAS ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- MIDDLEWARES GLOBALES ---
app.use(cors({ origin: '*' })); // Permite conexión total entre subdominios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

// --- 1. APP API (Subdominio) ---
const accountsRouter = require('./routes/accounts');
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());
apiApp.use(accountsRouter); // Tus rutas ya deben incluir el /v1 internamente

app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));

// --- 2. APP WEB (Dominio Principal) ---
const frontendPath = path.join(__dirname, '../nexonetwork.space'); 
app.use(express.static(frontendPath));

// Rutas manuales para evitar errores 404
app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(frontendPath, 'profile.html')));

// --- LANZAMIENTO ---
const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NeXO ONLINE en puerto ${PORT}`);
});