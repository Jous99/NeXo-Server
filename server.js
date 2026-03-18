const express = require('express');
const cors = require('cors');
const vhost = require('vhost');
const fs = require('fs');
const app = express();

app.use(cors());

const DOMAIN = 'nexonetwork.space';
// Lista de servicios y sus subdominios correspondientes
const modules = [
    { id: 'accounts', name: 'Accounts API', sub: 'accounts-api-lp1' },
    { id: 'config', name: 'Config Service', sub: 'config-lp1' },
    { id: 'bcat', name: 'BCAT Delivery', sub: 'bcat-lp1' },
    { id: 'friends', name: 'Friends Server', sub: 'friends-lp1' }
];

app.get('/health', (req, res) => {
    const statusReport = modules.map(mod => {
        // Verifica si el archivo del servicio existe en la carpeta /services
        const exists = fs.existsSync(`./services/${mod.id}.js`);
        return {
            name: mod.name,
            endpoint: `${mod.sub}.${DOMAIN}`,
            online: exists // Si el archivo existe, lo marcamos como activo
        };
    });

    res.json({
        project: 'NeXoServer',
        status: 'online',
        modules: statusReport,
        timestamp: Date.now()
    });
});

// Carga dinámica de vhosts
modules.forEach(mod => {
    try {
        if (fs.existsSync(`./services/${mod.id}.js`)) {
            app.use(vhost(`${mod.sub}.${DOMAIN}`, require(`./services/${mod.id}`)));
        }
    } catch (err) {
        console.error(`Error al cargar el módulo ${mod.id}:`, err.message);
    }
});

app.listen(4000, '0.0.0.0', () => {
    console.log('NeXoServer operativo en puerto 4000');
});