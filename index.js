const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('./src/models');

// Importación de rutas
const clientRoutes = require('./src/routes/clientRoutes');
const webRoutes = require('./src/routes/webRoutes');

const app = express();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- 📊 SISTEMA DE LOGS MULTIPLATAFORMA (WEB vs EMULADOR) ---
app.use((req, res, next) => {
    const now = new Date().toLocaleTimeString();
    const userAgent = req.headers['user-agent'] || '';
    
    // Identificación del origen de la petición
    let source = "";
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome')) {
        source = "\x1b[34m🌐 WEB\x1b[0m"; // Azul
    } else if (userAgent.includes('httplib') || userAgent.includes('Nintendo')) {
        source = "\x1b[35m🎮 EMULADOR\x1b[0m"; // Magenta (Emulador)
    } else {
        source = "\x1b[37m❓ OTRO\x1b[0m"; // Blanco
    }

    console.log(`[${now}] [${source}] \x1b[33m${req.method}\x1b[0m ${req.url}`);

    // Log de datos del cuerpo (Body) con protección de contraseña
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        const safeBody = { ...req.body };
        if (safeBody.password) safeBody.password = "********";
        console.log(`   📦 Body:`, JSON.stringify(safeBody));
    }
    next();
});

// --- 🛣️ RUTAS FÍSICAS Y REDIRECCIONES ---
// Estas rutas aseguran que el navegador encuentre los archivos HTML
app.get('/api/v1/client/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));

// Conexión de las APIs de Eden Network
app.use('/api/v1/web', webRoutes);
app.use('/api/v1/client', clientRoutes);
app.use('/api/v1/me', clientRoutes);

// --- 🔒 CONFIGURACIÓN SSL Y ARRANQUE ---
const sslOptions = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.cert')
};

// Sincronización maestra: actualiza la tabla si faltan columnas como PID o ROLE
db.sequelize.sync({ alter: true }) 
    .then(() => {
        https.createServer(sslOptions, app).listen(443, () => {
            console.log("\x1b[32m%s\x1b[0m", "==================================================");
            console.log("🌟 EDEN NETWORK ONLINE - LOGS ACTIVOS 🌟");
            console.log("📡 Host: accounts-api-lp1.raptor.network");
            console.log("==================================================");
        });
    })
    .catch(err => {
        console.error("\x1b[31m%s\x1b[0m", "❌ Error al sincronizar Base de Datos:", err.message);
    });