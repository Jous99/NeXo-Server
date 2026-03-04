require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan'); 
const db = require('./src/models/index'); // Asegúrate de que este archivo exporta 'sequelize'

const webRoutes = require('./src/routes/webRoutes');
const clientRoutes = require('./src/routes/clientRoutes');

const app = express();
const PORT = 443;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    console.log(`\n[${new Date().toLocaleTimeString()}] 📡 PETICIÓN: ${req.method} ${req.originalUrl}`);
    next();
});

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('<h1>Eden Network Online</h1>');
    }
});

app.use('/api/v1/web', webRoutes);
app.use('/api/v1/client', clientRoutes);
app.use('/api/v1/user', clientRoutes);

const certPath = path.join(__dirname, 'certs');
let httpsOptions;

try {
    httpsOptions = {
        key: fs.readFileSync(path.join(certPath, 'server.key')),
        cert: fs.readFileSync(path.join(certPath, 'server.cert'))
    };
    console.log('🔒 Certificados SSL cargados correctamente.');
} catch (e) {
    console.error("❌ ERROR CRÍTICO: No se encontraron los certificados.");
    process.exit(1);
}

async function startEdenServer() {
    try {
        console.log('⏳ Conectando a MySQL...');
        
        // Intentamos sincronizar usando la propiedad sequelize
        if (db.sequelize) {
            await db.sequelize.sync();
            console.log('✅ Base de datos sincronizada.');
        } else if (typeof db.syncDatabase === 'function') {
            await db.syncDatabase();
            console.log('✅ Base de datos sincronizada.');
        } else {
            console.log('⚠️ Advertencia: No se encontró función de sincronización, saltando...');
        }

        https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
            console.log(`
            ===========================================
            ✅ EDEN NETWORK TOTALMENTE OPERATIVO
            🌐 WEB: https://accounts-api-lp1.raptor.network
            ===========================================
            `);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error.message);
    }
}

startEdenServer();