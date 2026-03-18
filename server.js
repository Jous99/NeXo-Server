const express = require('express');
const cors = require('cors');
const vhost = require('vhost');
const fs = require('fs');
require('dotenv').config(); // Importante para leer el .env

const app = express();
app.use(cors());
app.use(express.json()); // Necesario para recibir JSON en los POST de login/register

const DOMAIN = 'nexonetwork.space';

// Configuración de módulos
// 'route' debe coincidir con el nombre del archivo en la carpeta /routes
const modules = [
    { id: 'accounts', name: 'Accounts API', sub: 'accounts-api-lp1', route: 'accounts' },
    { id: 'config', name: 'Config Service', sub: 'config-lp1', route: 'config' },
    { id: 'bcat', name: 'BCAT Delivery', sub: 'bcat-lp1', route: 'bcat' },
    { id: 'friends', name: 'Friends Server', sub: 'friends-lp1', route: 'friends' }
];

// --- ENDPOINT DE SALUD (HEALTH) ---
app.get('/health', (req, res) => {
    const statusReport = modules.map(mod => {
        // Verificamos si existe el archivo de RUTA, que es lo que expone el servicio al exterior
        const exists = fs.existsSync(`./routes/${mod.route}.js`);
        return {
            name: mod.name,
            endpoint: `${mod.sub}.${DOMAIN}`,
            online: exists 
        };
    });

    res.json({
        project: 'NeXo Network',
        status: 'online',
        modules: statusReport,
        timestamp: Date.now()
    });
});

// --- CARGA DINÁMICA DE VHOSTS ---
modules.forEach(mod => {
    const routePath = `./routes/${mod.route}.js`;
    
    if (fs.existsSync(routePath)) {
        const serviceApp = express(); // Creamos una mini-app para cada subdominio
        const router = require(routePath);
        
        serviceApp.use(cors());
        serviceApp.use(express.json());
        
        // Montamos las rutas. 
        // Si en el router usaste '/', aquí se accederá directamente vía subdominio.
        serviceApp.use('/', router); 

        app.use(vhost(`${mod.sub}.${DOMAIN}`, serviceApp));
        console.log(`[NeXo] Módulo ${mod.name} montado en ${mod.sub}.${DOMAIN}`);
    } else {
        console.warn(`[NeXo] Aviso: No se encontró la ruta para ${mod.name} en ${routePath}`);
    }
});

// Puerto 4000 (Recuerda mapear esto en tu Proxy Inverso si usas Nginx)
app.listen(4000, '0.0.0.0', () => {
    console.log('-------------------------------------------');
    console.log('NeXoServer OPERATIVO - Puerto 4000');
    console.log(`Dominio base: ${DOMAIN}`);
    console.log('-------------------------------------------');
});