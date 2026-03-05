const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('./src/models');

const app = express();

// Middlewares obligatorios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 📊 LOGS DE EDEN NETWORK (Optimizado)
app.use((req, res, next) => {
    const now = new Date().toLocaleTimeString();
    const ua = req.headers['user-agent'] || '';
    const source = (ua.includes('Raptor') || ua.includes('httplib')) ? "\x1b[35m🎮 EMU\x1b[0m" : "\x1b[34m🌐 WEB\x1b[0m";
    
    console.log(`\n\x1b[44m[${now}]\x1b[0m ${source} \x1b[1m${req.method}\x1b[0m \x1b[32m${req.path}\x1b[0m`);
    
    if (req.headers['r-hardwareid']) {
        console.log(`   🆔 HWID detectado: ${req.headers['r-hardwareid'].substring(0, 15)}...`);
    }
    next();
});

// Rutas estáticas
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));

// Conexión de APIs
const webRoutes = require('./src/routes/webRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
app.use('/api/v1/web', webRoutes);
app.use('/api/v1/client', clientRoutes);

// Certificados SSL (Asegúrate de que existan)
const sslOptions = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.cert')
};

// Sincronización y arranque
db.sequelize.sync({ force: false }).then(() => {
    https.createServer(sslOptions, app).listen(443, () => {
        console.log("\x1b[32m🌟 EDEN NETWORK: PERFECCIONADO Y ONLINE 🌟\x1b[0m");
    });
}).catch(err => console.error("❌ Error DB:", err.message));