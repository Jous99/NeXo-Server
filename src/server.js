'use strict';

require('dotenv').config();

const fs       = require('fs');
const path     = require('path');
const Fastify  = require('fastify');
const fjwt     = require('@fastify/jwt');
const fcors    = require('@fastify/cors');
const sensible = require('@fastify/sensible');

const errorHandler     = require('./plugins/errorHandler');
const { authenticate } = require('./middleware/auth');

// ── Módulo Accounts ───────────────────────────────────────────────────────────
const authRoutes    = require('./modules/accounts/routes/auth');
const profileRoutes = require('./modules/accounts/routes/profile');
const friendsRoutes = require('./modules/accounts/routes/friends');
const adminRoutes   = require('./modules/accounts/routes/admin');

// ── Módulos por subdominio (protocolo RaptorCitrus) ───────────────────────────
const accountsApiRoutes  = require('./modules/raptor/accounts-api');
const profileApiRoutes   = require('./modules/raptor/profile-api');
const friendsApiRoutes   = require('./modules/raptor/friends-api');
const configApiRoutes    = require('./modules/raptor/config-api');
const statusApiRoutes    = require('./modules/raptor/status-api');
const notifApiRoutes     = require('./modules/raptor/notification-api');
const connectorRoutes    = require('./modules/raptor/connector-api');
const bcastRoutes        = require('./modules/raptor/bcat-api');

// ── Sistema ───────────────────────────────────────────────────────────────────
const systemRoutes = require('./routes/system');

// ── Juegos ────────────────────────────────────────────────────────────────────
const smm2Routes = require('./modules/games/smm2/routes');

// ── Web (HTML embebido) ───────────────────────────────────────────────────────
const webHtml    = require('./web/app');
const emuHtml    = fs.readFileSync(path.join(__dirname, 'web/nexo-emu.html'), 'utf8');

// ─── Mapa de subdominios → manejador ─────────────────────────────────────────
// Tu dominio base configurado en .env (ej: "nexonetwork.space")
// El servidor distingue el subdominio por el header Host de cada petición.
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'nexonetwork.space';

// ─────────────────────────────────────────────────────────────────────────────

async function buildApp() {
    const fastify = Fastify({
        logger:     { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
        trustProxy: true,
    });

    // ── CORS ──────────────────────────────────────────────────────────────────
    await fastify.register(fcors, {
        origin:         true,
        credentials:    true,
        methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    await fastify.register(sensible);
    await fastify.register(fjwt, {
        secret: process.env.JWT_SECRET || 'nexo_dev_secret_CHANGE_IN_PRODUCTION',
    });

    fastify.decorate('authenticate', authenticate);
    fastify.setErrorHandler(errorHandler);

    // ── Health check (responde en cualquier subdominio) ───────────────────────
    fastify.get('/health', async () => ({
        ok: true, service: 'nexo-server',
        version: require('../package.json').version,
        ts: Date.now(),
    }));

    // ── Página del emulador ───────────────────────────────────────────────────
    fastify.get('/emulator', async (req, reply) => {
        return reply.type('text/html').send(emuHtml);
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  ROUTER POR SUBDOMINIO
    //  El emulador conecta a subdominios diferentes según el servicio.
    //  Fastify recibe todas las peticiones en el mismo puerto (3000).
    //  aaPanel hace de reverse proxy para cada subdominio hacia localhost:3000.
    //  Aquí distinguimos el subdominio por el header Host.
    // ══════════════════════════════════════════════════════════════════════════

    fastify.addHook('onRequest', async (request, reply) => {
        const host = (request.headers.host || '').split(':')[0].toLowerCase();

        // Extraer subdominio (ej: "accounts-api-lp1" de "accounts-api-lp1.nexonetwork.space")
        const sub = host.replace(`.${BASE_DOMAIN}`, '').replace(BASE_DOMAIN, '');
        request.subdomain = sub || 'www';
    });

    // ── Web pública (dominio raíz o www) ──────────────────────────────────────
    fastify.get('/', async (req, reply) => {
        // Si es el dominio raíz o www, sirve la landing/portal
        const sub = req.subdomain;
        if (!sub || sub === 'www' || sub === BASE_DOMAIN) {
            return reply.type('text/html').send(webHtml);
        }
        // Otros subdominios no tienen ruta raíz
        return reply.code(404).send({ error: 'Not found' });
    });

    // ── Portal web (rutas de la SPA) ──────────────────────────────────────────
    // Todas las rutas no-API del dominio principal devuelven el HTML
    fastify.setNotFoundHandler(async (req, reply) => {
        const sub = req.subdomain;
        const isApiSubdomain = [
            'accounts-api-lp1', 'profile-lp1', 'friends-lp1',
            'config-lp1', 'bcat-lp1', 'notification-lp1',
            'connector-lp1', 'status-lp1', 'citrus-api-lp1',
            'smm2-lp1',
        ].includes(sub);

        if (!isApiSubdomain && req.method === 'GET') {
            return reply.type('text/html').send(webHtml);
        }
        return reply.code(404).send({ ok: false, error: 'Endpoint not found' });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  RUTAS POR SUBDOMINIO — Protocolo RaptorCitrus
    // ══════════════════════════════════════════════════════════════════════════

    // accounts-api-lp1.nexonetwork.space — Auth y cuentas desde el emulador
    fastify.register(accountsApiRoutes, { prefix: '/' });

    // profile-lp1.nexonetwork.space — Perfiles
    fastify.register(profileApiRoutes, { prefix: '/' });

    // friends-lp1.nexonetwork.space — Amigos
    fastify.register(friendsApiRoutes, { prefix: '/' });

    // config-lp1.nexonetwork.space — Configuración y lista de títulos
    fastify.register(configApiRoutes, { prefix: '/' });

    // status-lp1.nexonetwork.space — Estado del servidor (troubleshooter)
    fastify.register(statusApiRoutes, { prefix: '/' });

    // notification-lp1.nexonetwork.space
    fastify.register(notifApiRoutes, { prefix: '/' });

    // connector-lp1.nexonetwork.space
    fastify.register(connectorRoutes, { prefix: '/' });

    // bcat-lp1.nexonetwork.space — BCAT (background content)
    fastify.register(bcastRoutes, { prefix: '/' });

    // smm2-lp1.nexonetwork.space — Super Mario Maker 2
    fastify.register(smm2Routes, { prefix: '/' });

    // ══════════════════════════════════════════════════════════════════════════
    //  RUTAS WEB — Portal de usuario (dominio raíz)
    // ══════════════════════════════════════════════════════════════════════════
    fastify.register(authRoutes,    { prefix: '/auth' });
    fastify.register(profileRoutes, { prefix: '/profile' });
    fastify.register(friendsRoutes, { prefix: '/friends' });
    fastify.register(adminRoutes,   { prefix: '/admin' });
    fastify.register(systemRoutes,  { prefix: '/admin/system' });

    return fastify;
}

async function start() {
    const app  = await buildApp();
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    try {
        await app.listen({ port, host });
        console.log(`\n🎮 NeXoNetwork Server en http://${host}:${port}`);
        console.log(`   Dominio base: ${BASE_DOMAIN}`);
        console.log(`\n   Subdominios que debes configurar en aaPanel:`);
        console.log(`   → ${BASE_DOMAIN}                     (web + portal)`);
        console.log(`   → accounts-api-lp1.${BASE_DOMAIN}   (auth emulador)`);
        console.log(`   → profile-lp1.${BASE_DOMAIN}        (perfiles)`);
        console.log(`   → friends-lp1.${BASE_DOMAIN}        (amigos)`);
        console.log(`   → config-lp1.${BASE_DOMAIN}         (configuración)`);
        console.log(`   → bcat-lp1.${BASE_DOMAIN}           (BCAT)`);
        console.log(`   → notification-lp1.${BASE_DOMAIN}   (notificaciones)`);
        console.log(`   → connector-lp1.${BASE_DOMAIN}      (connector)`);
        console.log(`   → status-lp1.${BASE_DOMAIN}         (estado)\n`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();
