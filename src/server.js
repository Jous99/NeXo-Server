'use strict';

require('dotenv').config();

const path      = require('path');
const Fastify   = require('fastify');
const fjwt      = require('@fastify/jwt');
const fstatic   = require('@fastify/static');
const sensible  = require('@fastify/sensible');

const errorHandler  = require('./plugins/errorHandler');
const { authenticate } = require('./middleware/auth');

// ── Módulo: Accounts ─────────────────────────────────────────────────────────
const authRoutes    = require('./modules/accounts/routes/auth');
const profileRoutes = require('./modules/accounts/routes/profile');
const friendsRoutes = require('./modules/accounts/routes/friends');
const adminRoutes   = require('./modules/accounts/routes/admin');
const raptorRoutes  = require('./modules/accounts/routes/raptor');

// ── Sistema / Panel admin ─────────────────────────────────────────────────────
const systemRoutes  = require('./routes/system');

// ── Módulos de juego (añadir aquí cuando estén listos) ───────────────────────
// const marioKartRoutes = require('./modules/games/mario-kart');

// ─────────────────────────────────────────────────────────────────────────────

async function buildApp() {
    const fastify = Fastify({
        logger: {
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
        },
        trustProxy: true,
    });

    // ── Plugins ──────────────────────────────────────────────────────────────
    await fastify.register(sensible);

    await fastify.register(fjwt, {
        secret: process.env.JWT_SECRET || 'nexo_dev_secret_CHANGE_IN_PRODUCTION',
    });

    // Servir la web estática desde src/web/public
    await fastify.register(fstatic, {
        root:   path.join(__dirname, 'web', 'public'),
        prefix: '/',
        // No lanzar 404 si el archivo no existe — deja pasar a las rutas API
        wildcard: false,
    });

    // Ruta raíz — sirve la landing page
    fastify.get('/', async (req, reply) => {
        return reply.sendFile('index.html');
    });

    // Rutas del portal (single-page app — todas devuelven index.html)
    fastify.get('/portal', async (req, reply) => reply.sendFile('index.html'));
    fastify.get('/portal/*', async (req, reply) => reply.sendFile('index.html'));

    // ── Auth global ───────────────────────────────────────────────────────────
    fastify.decorate('authenticate', authenticate);

    // ── Error handler ─────────────────────────────────────────────────────────
    fastify.setErrorHandler(errorHandler);

    // ── Health check ──────────────────────────────────────────────────────────
    fastify.get('/health', async () => ({
        ok:      true,
        service: 'nexo-server',
        version: process.env.npm_package_version || '1.0.0',
        ts:      Date.now(),
    }));

    // ── Módulo: Accounts ──────────────────────────────────────────────────────
    fastify.register(authRoutes,    { prefix: '/auth' });
    fastify.register(profileRoutes, { prefix: '/profile' });
    fastify.register(friendsRoutes, { prefix: '/friends' });
    fastify.register(adminRoutes,   { prefix: '/admin' });

    // ── Módulo: RaptorNetwork (protocolo emulador) ────────────────────────────
    fastify.register(raptorRoutes);   // /api/v1/*

    // ── Sistema / Panel admin ──────────────────────────────────────────────────
    fastify.register(systemRoutes, { prefix: '/admin/system' });

    // ── Módulos de juego (descomentar cuando estén listos) ────────────────────
    // fastify.register(marioKartRoutes, { prefix: '/games/mario-kart' });

    return fastify;
}

async function start() {
    const app  = await buildApp();
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    try {
        await app.listen({ port, host });
        console.log(`
╔══════════════════════════════════════════╗
║         NeXoNetwork Server               ║
║  http://${host}:${port}                  ║
║                                          ║
║  Web:    http://localhost:${port}/       ║
║  API:    http://localhost:${port}/auth/  ║
║  Emulador: /api/v1/*                    ║
╚══════════════════════════════════════════╝`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();
