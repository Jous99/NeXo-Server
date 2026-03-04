const express = require('express');
const https = require('https');
const certManager = require('./src/middleware/certManager');

const app = express();

// --- CONFIGURACI車N DE MIDDLEWARES ---
app.use(express.json()); // Para entender JSON

// Logger corregido para evitar el error "Cannot convert undefined or null to object"
app.use((req, res, next) => {
    const now = new Date().toLocaleTimeString();
    console.log(`[${now}] ?? ${req.method} -> ${req.url}`);
    
    // Verificamos de forma segura si hay datos en el cuerpo de la petici車n
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   ?? Body:`, req.body);
    }
    next();
});

// --- RUTAS DE LA API (Descifrando el cliente) ---

// El que ya funcionaba
app.get('/api/v1/client/account_id', (req, res) => {
    res.send("0x123456789ABCDEF");
});

// El nuevo que te apareci車 en los logs
app.post('/api/v1/client/register/redirect', (req, res) => {
    console.log("?? Redirigiendo registro del cliente...");
    res.json({
        "status": "success",
        "url": "https://accounts-api-lp1.raptor.network/register" 
    });
});

// Reenv赤os de dominios
app.get('/api/v1/rewrites', (req, res) => {
    res.json([
        { "source": "nintendo.net", "destination": "127.0.0.1" }
    ]);
});

// --- INICIO DEL SERVIDOR ---

try {
    const pems = certManager.getOrCreate();
    const options = {
        key: pems.key,
        cert: pems.cert,
        secureOptions: require('constants').SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION
    };

    https.createServer(options, app).listen(443, () => {
        console.log("\n?? EDEN SERVER: COMUNICACI車N ESTABLECIDA");
        console.log("Esperando peticiones del emulador...\n");
    });
} catch (err) {
    console.error("? Error con el CertManager:", err.message);
}