/**
 * EDEN NETWORK - MAIN ENTRY POINT
 * Operating Tier: Free | Model: Gemini 3 Flash
 */

const express = require('express');
const https = require('https');
const config = require('./src/config/config');
const certManager = require('./src/middleware/certManager');
const { initDatabase } = require('./src/models/index');
const apiRoutes = require('./src/routes/api');

const app = express();

// --- 1. MIDDLEWARES ---
// Parse incoming JSON requests
app.use(express.json());

// Global Logging Middleware
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 📡 ${req.method} -> ${req.url}`);
    
    // Log body only if it contains data to avoid clutter
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        console.log(`   📦 Body: ${JSON.stringify(req.body, null, 2)}`);
    }
    next();
});

// --- 2. ROUTES ---
// Mount all API routes under /api/v1
app.use('/api/v1', apiRoutes);

// Health check or landing page for the redirect
app.get('/register', (req, res) => {
    res.send(`
        <body style="background:#0f172a; color:white; font-family:sans-serif; text-align:center; padding-top:50px;">
            <h1 style="color:#38bdf8;">🌿 Eden Network 🌿</h1>
            <p>Server status: <span style="color:#4ade80;">ONLINE</span></p>
            <p>Database: <span style="color:#4ade80;">CONNECTED (MySQL)</span></p>
        </body>
    `);
});

// --- 3. DATABASE & SERVER INITIALIZATION ---
async function startServer() {
    try {
        // Initialize MySQL Database
        await initDatabase();

        // Get or generate SSL Certificates
        const pems = certManager.getOrCreate();
        const httpsOptions = {
            key: pems.key,
            cert: pems.cert,
            secureOptions: require('constants').SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
            minVersion: 'TLSv1'
        };

        // Create HTTPS Server
        https.createServer(httpsOptions, app).listen(config.port, () => {
            console.log("\n" + "=".repeat(50));
            console.log(`🟢 EDEN CORE INFRASTRUCTURE ONLINE`);
            console.log(`🚀 Port: ${config.port} | Mode: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Base URL: https://${config.raptor.baseUrl}`);
            console.log("=".repeat(50) + "\n");
        });

    } catch (error) {
        console.error("❌ Critical error during server startup:");
        console.error(error.message);
        process.exit(1);
    }
}

// Global Exception Handlers
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.stack);
});

// Execute startup
startServer();