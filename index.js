const express = require('express');
const https = require('https');
const path = require('path');
const certManager = require('./src/middleware/certManager');

const app = express();
const PORT = 443;

// --- CONFIGURACIÓN DE MIDDLEWARES ---

// Importante: Esto debe ir ANTES de las rutas
app.use(express.json()); 

// LOGGER CORREGIDO: Blindado contra 'undefined'
app.use((req, res, next) => {
    const now = new Date().toLocaleTimeString();
    console.log(`[${now}] 📡 ${req.method} -> ${req.url}`);
    
    // Verificamos si req.body existe y si tiene claves antes de procesarlo
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        console.log(`   📦 Body Data:`, JSON.stringify(req.body, null, 2));
    }
    next();
});

// --- RUTAS DE LA API ---

// 1. Identificador de cuenta (GET)
app.get('/api/v1/client/account_id', (req, res) => {
    console.log("👤 Enviando Account ID al cliente");
    res.send("0x123456789ABCDEF");
});

// 2. Redirección de registro (POST) - La que pedía el emulador
app.post('/api/v1/client/register/redirect', (req, res) => {
    console.log("🔗 Redirigiendo flujo de registro...");
    res.json({
        "status": "success",
        "url": "https://accounts-api-lp1.raptor.network/register"
    });
});

// 3. Tabla de reenvíos
app.get('/api/v1/rewrites', (req, res) => {
    res.json([
        { "source": "nintendo.net", "destination": "127.0.0.1" }
    ]);
});

// --- INICIO DEL SERVIDOR SEGURO ---

try {
    const pems = certManager.getOrCreate();

    const httpsOptions = {
        key: pems.key,
        cert: pems.cert,
        secureOptions: require('constants').SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
        minVersion: 'TLSv1'
    };

    const server = https.createServer(httpsOptions, app);

    // Manejo de errores de conexión para que no se cierre el proceso
    server.on('tlsClientError', (err) => {
        // Ignoramos errores comunes de handshake mientras el usuario instala el cert
        if (err.message.includes('renegotiation')) return;
        console.log(`⚠️  Aviso SSL: ${err.message}`);
    });

    server.listen(PORT, () => {
        console.log("\n" + "=".repeat(40));
        console.log("🟢 EDEN INFRASTRUCTURE ONLINE");
        console.log(`🚀 Escuchando peticiones en puerto ${PORT}`);
        console.log("=".repeat(40) + "\n");
    });

} catch (error) {
    console.error("❌ Error fatal al cargar certificados:", error.message);
    process.exit(1);
}