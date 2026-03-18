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

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir fotos y archivos estáticos
app.use('/uploads', express.static(uploadDir));

// --- 1. CONFIGURACIÓN API (SUBDOMINIO) ---
const accountsRouter = require('./routes/accounts');
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());
apiApp.use(accountsRouter);
app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));

// --- 2. CONFIGURACIÓN WEB (DOMINIO/IP) ---
const frontendPath = path.join(__dirname, '../nexonetwork.space'); 
app.use(express.static(frontendPath));

app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(frontendPath, 'profile.html')));

// --- MANEJO DE ERRORES ---
process.on('uncaughtException', (err) => console.error('❌ Error:', err.message));

// --- PUERTO 4000 ---
const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log('🚀 NeXO NETWORK ONLINE');
    console.log(`🏠 Puerto Fijo: ${PORT}`);
    console.log(`📂 Directorio Web: ${frontendPath}`);
    console.log('==================================================');
});