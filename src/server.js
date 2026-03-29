'use strict';

require('dotenv').config();

const Fastify     = require('fastify');
const fjwt        = require('@fastify/jwt');
const sensible    = require('@fastify/sensible');

const errorHandler  = require('./plugins/errorHandler');
const { authenticate } = require('./middleware/auth');

const authRoutes    = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const friendsRoutes = require('./routes/friends');
const adminRoutes   = require('./routes/admin');
const raptorRoutes  = require('./routes/raptor');

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

    // Expose authenticate as a decorator so routes can use fastify.authenticate
    fastify.decorate('authenticate', authenticate);

    // ── Error handler ────────────────────────────────────────────────────────
    fastify.setErrorHandler(errorHandler);

    // ── Health check ─────────────────────────────────────────────────────────
    fastify.get('/health', async () => ({ ok: true, service: 'nexo-accounts', ts: Date.now() }));

    // ── Routes ───────────────────────────────────────────────────────────────
    fastify.register(authRoutes,    { prefix: '/auth' });
    fastify.register(profileRoutes, { prefix: '/profile' });
    fastify.register(friendsRoutes, { prefix: '/friends' });
    fastify.register(adminRoutes,   { prefix: '/admin' });
    fastify.register(raptorRoutes); // /api/v1/* — RaptorNetwork client compatibility

    return fastify;
}

async function start() {
    const app  = await buildApp();
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    try {
        await app.listen({ port, host });
        console.log(`\n🎮 NeXoNetwork Accounts running on http://${host}:${port}\n`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();
