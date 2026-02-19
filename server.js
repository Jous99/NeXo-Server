const express = require('express');
const app = express();

// Configuración de puertos: 80 (Admin) o 3000
const PORT = 80; 

// Middleware para procesar diferentes tipos de datos que envían los emuladores
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text({ type: '*/*' }));

// --- INTERCEPTOR DE INVESTIGACIÓN (PROTEGIDO) ---
app.use((req, res, next) => {
    console.log(`\n--- [🔍 EDEN RESEARCH LOG] ---`);
    console.log(`TIMESTAMP: ${new Date().toLocaleTimeString()}`);
    console.log(`MÉTODO:    ${req.method}`);
    console.log(`URL:       ${req.originalUrl || req.url}`);
    
    // Log de User-Agent (clave para saber qué dispositivo conecta)
    if (req.headers['user-agent']) {
        console.log(`CLIENTE:   ${req.headers['user-agent']}`);
    }

    // PROTECCIÓN CONTRA EL ERROR 'undefined or null'
    // Verificamos que req.body exista antes de intentar usar Object.keys
    try {
        if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
            console.log(`BODY (JSON/URL):`, req.body);
        } else if (req.body && typeof req.body === 'string' && req.body.length > 0) {
            console.log(`BODY (TEXT):`, req.body);
        }
    } catch (e) {
        console.log(`⚠️ Error procesando body, pero el servidor sigue vivo.`);
    }
    
    console.log(`-----------------------------\n`);
    next(); 
});

// --- RUTAS DE EMULACIÓN (EDEN NETWORK CORE) ---

// 1. Test de Conexión (Fundamental para evitar errores de 'Sin Internet')
app.get('/conntest', (req, res) => {
    res.set('X-Organization', 'Nintendo');
    res.send("OK"); 
});

// 2. Simulación de NAS / Login (Basado en la lógica de Raptor)
app.post('/nas/login', (req, res) => {
    console.log("🔑 Intento de login detectado...");
    // Respuesta estándar que el emulador espera para dar el OK
    const response = "auth_token=EDEN_DEV_TOKEN_001&status=success&datetime=" + Date.now();
    res.send(response);
});

// 3. Sistema de Amigos (Ruta para tus pruebas de investigación)
app.get('/api/friends', (req, res) => {
    res.json([
        { pid: 100, name: "Jous", status: "online" },
        { pid: 101, name: "Gemini", status: "coding" }
    ]);
});

// --- MANEJO DE RUTAS NO ENCONTRADAS ---
app.use((req, res) => {
    // Si la petición llega aquí, es que no tenemos programada esa URL
    if (!res.headersSent) {
        console.log(`⚠️  RUTA NO PROGRAMADA: ${req.url}`);
        res.status(404).send("Eden Route Not Found");
    }
});

// --- LANZAMIENTO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`
    ===========================================
       EDEN NETWORK SERVER - INVESTIGACIÓN
    ===========================================
    🚀 Servidor activo en http://localhost:${PORT}
    🛠️  Modo: Aprendizaje Raptor Core
    ===========================================
    `);
});