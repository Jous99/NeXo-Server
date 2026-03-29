'use strict';

/**
 * accounts-api-lp1.nexonetwork.space
 *
 * El emulador (src/yuzu/online/monitor.cpp) conecta a este subdominio para:
 *   - Login / autenticación
 *   - Registro de cuenta
 *   - Refresh de token
 *   - Logout
 *
 * También citrus-api-lp1 usa este mismo handler para la API general.
 *
 * El cliente C++ usa httplib::SSLClient y espera respuestas JSON.
 */

const accounts = require('../accounts/services/accounts');

// Middleware: solo procesa si el host es accounts-api-lp1 o citrus-api-lp1
function isAccountsSubdomain(req) {
    const sub = req.subdomain || '';
    return ['accounts-api-lp1', 'citrus-api-lp1', 'www', ''].includes(sub);
}

async function accountsApiRoutes(fastify) {

    // ── Autenticación ─────────────────────────────────────────────────────────
    // El emulador hace POST /api/v1/auth/authenticate
    // Visto en: src/yuzu/online/monitor.cpp
    fastify.post('/api/v1/auth/authenticate', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const { username, password, token } = req.body || {};

        // El emulador puede mandar "token" (para re-auth) o username+password
        if (!username && !password && !token) {
            return reply.code(400).send({ error: 'Missing credentials' });
        }

        try {
            let result;
            if (token) {
                // Re-autenticación con token existente
                result = await accounts.refreshSession(token);
                const access_token = fastify.jwt.sign(
                    { nexo_id: result.nexo_id },
                    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
                );
                return reply.send({
                    result:    'Success',
                    token:     access_token,
                    user_id:   result.nexo_id,
                });
            }

            result = await accounts.login({
                login:      username,
                password,
                deviceInfo: req.body?.client_version || 'NeXoEmulator',
                ip:         req.ip,
            });

            const access_token = fastify.jwt.sign(
                { nexo_id: result.nexo_id, nickname: result.nickname },
                { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
            );

            return reply.send({
                result:        'Success',
                token:         access_token,
                refresh_token: result.refresh_token,
                user_id:       result.nexo_id,
                display_name:  result.nickname,
            });
        } catch (err) {
            return reply.code(401).send({ result: 'Failed', error: err.message });
        }
    });

    // Alias: algunos clientes usan /api/v1/user/authenticate
    fastify.post('/api/v1/user/authenticate', async (req, reply) => {
        req.url = '/api/v1/auth/authenticate';
        // Redirige internamente
        const { username, password } = req.body || {};
        if (!username || !password) return reply.code(400).send({ result: 'Failed', error: 'Missing credentials' });

        try {
            const result = await accounts.login({ login: username, password, deviceInfo: 'NeXoEmulator', ip: req.ip });
            const access_token = fastify.jwt.sign(
                { nexo_id: result.nexo_id, nickname: result.nickname },
                { expiresIn: '15m' }
            );
            return reply.send({
                result:        'Success',
                token:         access_token,
                refresh_token: result.refresh_token,
                user_id:       result.nexo_id,
                display_name:  result.nickname,
            });
        } catch (err) {
            return reply.code(401).send({ result: 'Failed', error: err.message });
        }
    });

    // ── Registro ──────────────────────────────────────────────────────────────
    fastify.post('/api/v1/auth/register', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const { username, password, email, display_name } = req.body || {};
        if (!username || !password || !email) {
            return reply.code(400).send({ result: 'Failed', error: 'Missing required fields' });
        }

        try {
            const result = await accounts.register({ username, email, password, nickname: display_name });
            return reply.code(201).send({ result: 'Success', user_id: result.nexo_id });
        } catch (err) {
            const code = err.code === 'CONFLICT' ? 409 : 400;
            return reply.code(code).send({ result: 'Failed', error: err.message });
        }
    });

    // ── Refresh token ─────────────────────────────────────────────────────────
    fastify.post('/api/v1/auth/refresh', async (req, reply) => {
        const raw = req.body?.refresh_token || req.headers['x-refresh-token'];
        if (!raw) return reply.code(400).send({ result: 'Failed', error: 'Missing refresh token' });

        try {
            const { nexo_id } = await accounts.refreshSession(raw);
            const token = fastify.jwt.sign({ nexo_id }, { expiresIn: '15m' });
            return reply.send({ result: 'Success', token });
        } catch (err) {
            return reply.code(401).send({ result: 'Failed', error: err.message });
        }
    });

    // ── Logout ────────────────────────────────────────────────────────────────
    fastify.post('/api/v1/auth/logout', async (req, reply) => {
        const raw = req.body?.refresh_token;
        if (raw) await accounts.logout(raw).catch(() => {});
        return reply.send({ result: 'Success' });
    });

    // ── Info del servidor (citrus-api-lp1) ────────────────────────────────────
    // Visto en: src/yuzu/configuration/config.cpp
    // web_api_url = "https://citrus-api-lp1.raptor.network"
    fastify.get('/api/v1/server/info', async (req, reply) => {
        return reply.send({
            result:      'Success',
            name:        'NeXoNetwork',
            version:     require('../../../package.json').version,
            motd:        process.env.MOTD || 'Welcome to NeXoNetwork — Open Switch Online.',
            maintenance: false,
        });
    });

    // Telemetry opt-in (el emulador lo llama al iniciar)
    fastify.post('/api/v1/telemetry', async (req, reply) => {
        return reply.send({ result: 'Success' });
    });
}

module.exports = accountsApiRoutes;
