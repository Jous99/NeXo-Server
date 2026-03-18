require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const path = require('path');

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- LOG DE ACCESO BÁSICO ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.hostname}${req.url}`);
    next();
});

// --- IMPORTACIÓN DE RUTAS ---
const accountsRouter = require('./routes/accounts');

// Verificación de integridad del módulo
if (!accountsRouter || typeof accountsRouter !== 'function') {
    console.error('❌ ERROR CRÍTICO: El router de accounts no se cargó. Revisa routes/accounts.js');
    process.exit(1);
}

// --- CONFIGURACIÓN DE SUBDOMINIOS (VHOST) ---
// Responde a: https://accounts-api-lp1.nexonetwork.space
app.use(vhost('accounts-api-lp1.nexonetwork.space', accountsRouter));

// --- RUTA DE SALUD Y DIAGNÓSTICO ---
app.get('/health', (req, res) => {
    res.json({
        status: "online",
        server: "NeXo-Core-Ubuntu",
        timestamp: Date.now(),
        node_version: process.version
    });
});

// --- MANEJO DE ERRORES 404 ---
app.use((req, res) => {
    res.status(404).json({ status: "error", message: "Ruta no encontrada en NeXo Network" });
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log('==================================================');
    console.log('🚀 NeXo Network Backend ACTIVO');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🔗 Dominio: accounts-api-lp1.nexonetwork.space`);
    console.log('==================================================');
});