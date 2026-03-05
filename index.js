const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('./src/models');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

global.lastLoggedUser = null;

// --- 🛡️ CABECERAS DE RED (Keep-Alive Vital para Raptor) ---
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Connection', 'keep-alive');
    next();
});

// --- 🔍 LOGS FORENSES (DETALLADOS) ---
app.use((req, res, next) => {
    const isEmu = (req.headers['user-agent'] || '').includes('Raptor') || req.headers['r-hardwareid'];
    console.log(`\n\x1b[44m[${new Date().toLocaleTimeString()}]\x1b[0m ${isEmu ? '🎮 EMU' : '🌐 WEB'} \x1b[1m${req.method}\x1b[0m \x1b[32m${req.path}\x1b[0m`);
    
    const oldSend = res.send;
    res.send = function (data) {
        console.log(`   📤 RESPUESTA: ${data}`);
        return oldSend.apply(res, arguments);
    };
    next();
});

// --- 🛣️ RUTAS CORREGIDAS PARA JOUS ---
const clientRoutes = require('./src/routes/clientRoutes');
const webRoutes = require('./src/routes/webRoutes');

app.use('/api/v1/client', clientRoutes);
app.use('/api/v1/web', webRoutes);
app.use('/api/v1/titles', (req, res) => res.json([]));

// Vistas
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));

const sslOptions = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.cert')
};

db.sequelize.sync({ force: false }).then(() => {
    https.createServer(sslOptions, app).listen(443, () => {
        console.log("\x1b[32m🌟 EDEN NETWORK: MODO INYECCIÓN JOUS ACTIVADO 🌟\x1b[0m");
    });
});