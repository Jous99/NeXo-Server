require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// --- CONFIGURACIÓN DE CARPETAS ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- MIDDLEWARES GLOBALES ---
// Permitimos todo temporalmente para descartar que el error sea por seguridad del navegador
app.use(cors({ origin: '*' })); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

// --- 1. CONFIGURACIÓN API (SUBDOMINIO) ---
const accountsRouter = require('./routes/accounts');
const apiApp = express();

apiApp.use(cors({ origin: '*' }));
apiApp.use(express.json());
// Quitamos el prefijo /v1 de aquí si tus rutas en accounts.js ya lo tienen
apiApp.use(accountsRouter); 

app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));

// --- 2. CONFIGURACIÓN WEB ---
const frontendPath = path.join(__dirname, '../nexonetwork.space'); 
app.use(express.static(frontendPath));

app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(frontendPath, 'profile.html')));

// --- INICIO DEL SERVIDOR ---
const PORT = 4000;
// IMPORTANTE: Cambiado a '0.0.0.0' para permitir acceso desde internet
app.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log('🚀 NeXO NETWORK ONLINE');
    console.log(`📡 Escuchando en: http://0.0.0.0:${PORT}`);
    console.log('==================================================');
});