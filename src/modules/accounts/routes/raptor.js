'use strict';

/**
 * RaptorNetwork compatibility layer
 * 
 * The Yuzu-based client (RaptorNetworkBackup) communicates with these endpoints.
 * Based on reverse engineering of the C++ client which uses:
 *   - Boost.ASIO for HTTP
 *   - OpenSSL for TLS
 *   - nlohmann/json for parsing
 * 
 * The client expects these specific paths and response shapes.
 */

const db       = require('../../../db');
const accounts = require('../services/accounts');

async function raptorRoutes(fastify) {

    // ── AUTHENTICATION ───────────────────────────────────────────────────────
    // The C++ client POSTs to /api/v1/user/authenticate with JSON body
    // and expects { token, user_id, username } back
    fastify.post('/api/v1/user/authenticate', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username:    { type: 'string' },
                    password:    { type: 'string' },
                    client_ver:  { type: 'string' },   // emulator version string
                    platform:    { type: 'string' },   // "Switch" / "NX"
                },
                additionalProperties: true,
            }
        }
    }, async (req, reply) => {
        const { username, password, client_ver, platform } = req.body;
        const deviceInfo = `${platform || 'NX'} / ${client_ver || 'unknown'}`;

        try {
            const result = await accounts.login({
                login:      username,
                password,
                deviceInfo,
                ip: req.ip,
            });

            const access_token = fastify.jwt.sign(
                { nexo_id: result.nexo_id, nickname: result.nickname },
                { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
            );

            // Raptor-compatible response shape
            return reply.send({
                result:   'Success',
                token:    access_token,
                refresh:  result.refresh_token,
                user_id:  result.nexo_id,
                username: result.nickname,
            });
        } catch (err) {
            return reply.code(401).send({ result: 'Failed', message: err.message });
        }
    });

    // ── REGISTER ─────────────────────────────────────────────────────────────
    fastify.post('/api/v1/user/register', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password', 'email'],
                properties: {
                    username: { type: 'string', minLength: 3, maxLength: 32 },
                    password: { type: 'string', minLength: 8 },
                    email:    { type: 'string' },
                    nickname: { type: 'string' },
                },
                additionalProperties: true,
            }
        }
    }, async (req, reply) => {
        try {
            const result = await accounts.register(req.body);
            return reply.code(201).send({ result: 'Success', nexo_id: result.nexo_id });
        } catch (err) {
            const code = err.code === 'CONFLICT' ? 409 : 400;
            return reply.code(code).send({ result: 'Failed', message: err.message });
        }
    });

    // ── TOKEN REFRESH ─────────────────────────────────────────────────────────
    fastify.post('/api/v1/user/refresh', async (req, reply) => {
        const raw = req.body?.refresh || req.headers['x-refresh-token'];
        if (!raw) return reply.code(400).send({ result: 'Failed', message: 'Missing refresh token' });

        try {
            const { nexo_id } = await accounts.refreshSession(raw);
            const token = fastify.jwt.sign({ nexo_id }, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' });
            return reply.send({ result: 'Success', token });
        } catch (err) {
            return reply.code(401).send({ result: 'Failed', message: err.message });
        }
    });

    // ── USER INFO ─────────────────────────────────────────────────────────────
    // Client calls this after login to get full profile
    fastify.get('/api/v1/user/me', {
        preHandler: [fastify.authenticate]
    }, async (req, reply) => {
        const profile = await accounts.getProfile(req.user.nexo_id);
        if (!profile) return reply.code(404).send({ result: 'Failed' });

        return reply.send({
            result:     'Success',
            user_id:    profile.nexo_id,
            username:   profile.nickname,
            avatar_url: profile.avatar_url || '',
            status:     profile.status || 'online',
            game:       profile.game_title || '',
            joined:     profile.created_at,
        });
    });

    // ── FRIEND LIST ───────────────────────────────────────────────────────────
    // The client fetches the friend list to show in-game overlay
    fastify.get('/api/v1/friends', {
        preHandler: [fastify.authenticate]
    }, async (req, reply) => {
        const list = await accounts.getFriends(req.user.nexo_id);
        const friends = list
            .filter(f => f.friendship_status === 'accepted')
            .map(f => ({
                user_id:    f.nexo_id,
                username:   f.nickname,
                avatar_url: f.avatar_url || '',
                status:     f.online_status || 'offline',
                game:       f.game_title || '',
                last_seen:  f.last_seen,
            }));

        return reply.send({ result: 'Success', friends });
    });

    // ── PRESENCE UPDATE ───────────────────────────────────────────────────────
    // The emulator calls this when launching a game or going idle
    fastify.post('/api/v1/presence', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                properties: {
                    status:   { type: 'string', enum: ['online', 'offline', 'in_game'] },
                    game:     { type: 'string' },
                    game_id:  { type: 'string' },
                },
                additionalProperties: true,
            }
        }
    }, async (req, reply) => {
        const { status, game, game_id } = req.body;
        await accounts.updatePresence(req.user.nexo_id, {
            status:     status || 'online',
            game_title: game   || null,
            game_id:    game_id || null,
        });
        return reply.send({ result: 'Success' });
    });

    // ── SERVER INFO ────────────────────────────────────────────────────────────
    // Client checks this on startup to verify server is reachable + get version
    fastify.get('/api/v1/server/info', async (req, reply) => {
        return reply.send({
            result:      'Success',
            name:        'NeXoNetwork',
            version:     '1.0.0',
            protocol:    1,
            motd:        'Welcome to NeXoNetwork — Open Nintendo Switch Online replacement.',
            maintenance: false,
        });
    });

    // ── FRIEND REQUEST (Raptor style) ─────────────────────────────────────────
    fastify.post('/api/v1/friends/request', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['target_id'],
                properties: {
                    target_id: { type: 'string' },
                },
            }
        }
    }, async (req, reply) => {
        try {
            await accounts.sendFriendRequest(req.user.nexo_id, req.body.target_id);
            return reply.send({ result: 'Success' });
        } catch (err) {
            return reply.code(400).send({ result: 'Failed', message: err.message });
        }
    });

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    fastify.post('/api/v1/user/logout', {
        preHandler: [fastify.authenticate]
    }, async (req, reply) => {
        const raw = req.body?.refresh;
        if (raw) await accounts.logout(raw);
        return reply.send({ result: 'Success' });
    });
}

module.exports = raptorRoutes;
