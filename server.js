require('dotenv').config();
const express = require('express');
const vhost = require('vhost');
const cors = require('cors');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Importación de rutas
const accountsRouter = require('./routes/accounts');

// Validación de carga
if (typeof accountsRouter !== 'function') {
    console.error('❌ Error: El router de accounts no es una función.');
    process.exit(1);
}

// Configuración del Subdominio
app.use(vhost('accounts-api-lp1.nexonetwork.space', accountsRouter));

// Ruta de prueba para la IP directa
app.get('/', (req, res) => {
    res.send('NeXo API Is Running');
});

// Inicio del servidor en puerto 4000
const PORT = 4000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log('🚀 NeXo Network Backend ACTIVO');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🔗 API: https://accounts-api-lp1.nexonetwork.space`);
    console.log('==================================================');
});

// Evitar que el proceso se cierre ante errores leves
process.on('uncaughtException', (err) => {
    console.error('⚠️ Se detectó un error pero el server sigue vivo:', err);
});