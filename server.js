require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// --- CONFIGURACIÓN DE CARPETAS ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- MIDDLEWARES GLOBALES ---
app.use(cors({ origin: '*' })); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir fotos (Accesibles desde nexonetwork.space/uploads/...)
app.use('/uploads', express.static(uploadDir));

// --- 1. APLICACIÓN API (Subdominio: accounts-api-lp1) ---
const accountsRouter = require('./routes/accounts');
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());

// Endpoint de salud para status.html
apiApp.get('/health', (req, res) => {
    res.json({ status: "ok", modules: [{ name: "Auth Core", endpoint: "/v1/login" }, { name: "Storage", endpoint: "/uploads" }] });
});

apiApp.use('/v1', accountsRouter);
app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));

// --- 2. APLICACIÓN WEB (Dominio: nexonetwork.space) ---
const frontendPath = path.join(__dirname, '../nexonetwork.space'); 
app.use(express.static(frontendPath));

// Rutas de navegación limpia
app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(frontendPath, 'profile.html')));
app.get('/status', (req, res) => res.sendFile(path.join(frontendPath, 'status.html')));

// --- LANZAMIENTO ---
const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('==============================================');
    console.log('🚀 NeXO NETWORK TOTAL SYSTEM ONLINE');
    console.log(`📡 Puerto: ${PORT} | Modo: Producción`);
    console.log('==============================================');
});