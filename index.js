const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('./src/models');

const clientRoutes = require('./src/routes/clientRoutes');
const webRoutes = require('./src/routes/webRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- SOLUCIÓN "CANNOT GET" (Tus capturas 1, 2, 3, 4 y 6) ---
app.get('/api/v1/client/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/api/v1/client/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/api/v1/web/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

// Conexión de las APIs
app.use('/api/v1/client', clientRoutes);
app.use('/api/v1/web', webRoutes);
app.use('/api/v1/me', clientRoutes);

// --- CONFIGURACIÓN SSL ---
const sslOptions = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.cert')
};

// --- ⚡ SINCRONIZACIÓN MAESTRA ---
// 'alter: true' detecta las columnas 'role' y 'pid' que faltan y las crea.
db.sequelize.sync({ alter: true })
    .then(() => {
        console.log("--------------------------------------------------");
        console.log("✅ [DATABASE] ¡Columnas 'role' y 'pid' creadas con éxito!");
        
        https.createServer(sslOptions, app).listen(443, () => {
            console.log("🌟 EDEN NETWORK ONLINE - Todo corregido 🌟");
        });
    })
    .catch(err => {
        console.error("❌ Error crítico en DB:", err.message);
    });