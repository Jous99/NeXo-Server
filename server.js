require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// --- ASEGURAR CARPETA DE SUBIDAS ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- CONFIGURACIÓN GLOBAL ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta de fotos públicamente
app.use('/uploads', express.static(uploadDir));

// --- 1. CONFIGURACIÓN DEL BACKEND (API) ---
const accountsRouter = require('./routes/accounts');
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());
apiApp.use(accountsRouter);

// Vincular subdominio
app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));

// --- 2. CONFIGURACIÓN DEL FRONTEND (WEB) ---
const frontendPath = path.join(__dirname, '../nexonetwork.space'); 
app.use(express.static(frontendPath));

app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(frontendPath, 'profile.html')));

// --- INICIO DEL SERVIDOR ---
const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log('🚀 NeXO NETWORK - SISTEMA DE PERFILES ACTIVO');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`📂 Almacenamiento: ${uploadDir}`);
    console.log('==================================================');
});