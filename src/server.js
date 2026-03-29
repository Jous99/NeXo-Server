'use strict';

require('dotenv').config();

const path     = require('path');
const Fastify  = require('fastify');
const fjwt     = require('@fastify/jwt');
const fstatic  = require('@fastify/static');
const sensible = require('@fastify/sensible');

const errorHandler     = require('./plugins/errorHandler');
const { authenticate } = require('./middleware/auth');

// ── Módulo: Accounts ─────────────────────────────────────────────────────────
const authRoutes    = require('./modules/accounts/routes/auth');
const profileRoutes = require('./modules/accounts/routes/profile');
const friendsRoutes = require('./modules/accounts/routes/friends');
const adminRoutes   = require('./modules/accounts/routes/admin');
const raptorRoutes  = require('./modules/accounts/routes/raptor');

// ── Sistema (update desde Forgejo, logs, status) ──────────────────────────────
const systemRoutes  = require('./routes/system');

// ── Módulos de juego — añadir aquí cuando estén listos ───────────────────────
// const matchmakingRoutes = require('./modules/games/matchmaking');

// ─────────────────────────────────────────────────────────────────────────────

async function buildApp() {
    const fastify = Fastify({
        logger: {
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
        },
        trustProxy: true,
    });

    // ── Plugins ───────────────────────────────────────────────────────────────
    await fastify.register(sensible);

    await fastify.register(fjwt, {
        secret: process.env.JWT_SECRET || 'nexo_dev_secret_CHANGE_IN_PRODUCTION',
    });

    // Servir archivos estáticos (web) desde src/web/public
    await fastify.register(fstatic, {
        root:     path.join(__dirname, 'web', 'public'),
        prefix:   '/assets/',
        wildcard: false,
    });

    // Auth global
    fastify.decorate('authenticate', authenticate);

    // Error handler
    fastify.setErrorHandler(errorHandler);

    // ── Health check ──────────────────────────────────────────────────────────
    fastify.get('/health', async () => ({
        ok:      true,
        service: 'nexo-server',
        version: require('../package.json').version,
        ts:      Date.now(),
    }));

    // ── Web — la landing page y el portal se sirven desde aquí ───────────────
    // El HTML está embebido directamente en el servidor para máxima simplicidad
    // con aaPanel Node Project (un solo proceso, sin ficheros estáticos sueltos)
    fastify.get('/', async (req, reply) => {
        const html = require('./web/app');
        return reply.type('text/html').send(html);
    });

    // ── Módulo: Accounts ──────────────────────────────────────────────────────
    fastify.register(authRoutes,    { prefix: '/auth' });
    fastify.register(profileRoutes, { prefix: '/profile' });
    fastify.register(friendsRoutes, { prefix: '/friends' });
    fastify.register(adminRoutes,   { prefix: '/admin' });

    // ── Módulo: RaptorNetwork (protocolo emulador) ────────────────────────────
    fastify.register(raptorRoutes);   // registra /api/v1/*

    // ── Sistema (update desde Forgejo) ────────────────────────────────────────
    fastify.register(systemRoutes, { prefix: '/admin/system' });

    // ── Módulos de juego ──────────────────────────────────────────────────────
    // fastify.register(matchmakingRoutes, { prefix: '/games' });

    return fastify;
}

async function start() {
    const app  = await buildApp();
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    try {
        await app.listen({ port, host });
        console.log(`\n🎮 NeXoNetwork Server corriendo en http://${host}:${port}`);
        console.log(`   Web:      http://localhost:${port}/`);
        console.log(`   API:      http://localhost:${port}/auth/`);
        console.log(`   Emulador: http://localhost:${port}/api/v1/\n`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();
