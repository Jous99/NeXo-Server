require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// --- CONFIGURACIÓN DE CARPETAS ---
// Aseguramos que 'uploads' esté en la raíz del backend
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- MIDDLEWARES GLOBALES ---
// IMPORTANTE: Permitir que el frontend acceda a la API sin bloqueos
app.use(cors({
    origin: ['https://nexonetwork.space', 'https://accounts-api-lp1.nexonetwork.space'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir fotos: Esto permite que nexonetwork.space/uploads/foto.jpg funcione
app.use('/uploads', express.static(uploadDir));

// --- 1. CONFIGURACIÓN API (SUBDOMINIO: accounts-api-lp1) ---
const accountsRouter = require('./routes/accounts');
const apiApp = express();

apiApp.use(cors()); // CORS específico para la API
apiApp.use(express.json());
apiApp.use('/v1', accountsRouter); // Agregamos el prefijo /v1 aquí para limpiar las rutas

app.use(vhost('accounts-api-lp1.nexonetwork.space', apiApp));

// --- 2. CONFIGURACIÓN WEB (DOMINIO PRINCIPAL) ---
const frontendPath = path.join(__dirname, '../nexonetwork.space'); 
app.use(express.static(frontendPath));

// Rutas amigables para los HTML
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(frontendPath, 'profile.html')));

// --- MANEJO DE ERRORES ---
process.on('uncaughtException', (err) => {
    console.error('❌ Error Crítico:', err.message);
});

// --- INICIO DEL SERVIDOR ---
const PORT = 4000;
app.listen(PORT, '127.0.0.1', () => { // Escuchamos localmente (Nginx se encarga del exterior)
    console.log('==================================================');
    console.log('🚀 NeXO NETWORK - NÚCLEO ACTIVO');
    console.log(`🏠 Interno: http://127.0.0.1:${PORT}`);
    console.log(`🌐 Público: https://nexonetwork.space`);
    console.log(`📂 Fotos: ${uploadDir}`);
    console.log('==================================================');
});