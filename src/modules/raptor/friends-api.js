'use strict';

/**
 * friends-lp1.nexonetwork.space
 *
 * El emulador llama a este subdominio para:
 *   - Obtener lista de amigos con estado online/in_game
 *   - Enviar solicitudes de amistad
 *   - Ver presencia de amigos en tiempo real
 *
 * Visto en: src/core/online_initiator.cpp → FriendsApiUrl()
 */

const accounts = require('../accounts/services/accounts');

function isThisSubdomain(req) {
    return ['friends-lp1', 'www', ''].includes(req.subdomain || '');
}

async function friendsApiRoutes(fastify) {

    // GET /api/v1/friends — lista de amigos con presencia
    fastify.get('/api/v1/friends', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const list = await accounts.getFriends(req.user.nexo_id);
        const friends = list
            .filter(f => f.friendship_status === 'accepted')
            .map(f => ({
                user_id:      f.nexo_id,
                display_name: f.nickname,
                avatar_url:   f.avatar_url || '',
                presence: {
                    status:     f.online_status || 'offline',
                    game_title: f.game_title   || null,
                    game_id:    f.game_id      || null,
                    last_seen:  f.last_seen    || null,
                },
            }));

        return reply.send({ result: 'Success', friends });
    });

    // GET /api/v1/friends/requests — solicitudes pendientes
    fastify.get('/api/v1/friends/requests', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const list = await accounts.getFriends(req.user.nexo_id);
        const requests = list
            .filter(f => f.friendship_status === 'pending')
            .map(f => ({
                user_id:      f.nexo_id,
                display_name: f.nickname,
                direction:    f.direction,
            }));

        return reply.send({ result: 'Success', requests });
    });

    // POST /api/v1/friends/request — enviar solicitud
    fastify.post('/api/v1/friends/request', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const target = req.body?.user_id || req.body?.nexo_id;
        if (!target) return reply.code(400).send({ result: 'Failed', error: 'Missing user_id' });

        try {
            await accounts.sendFriendRequest(req.user.nexo_id, target);
            return reply.send({ result: 'Success' });
        } catch (err) {
            return reply.code(400).send({ result: 'Failed', error: err.message });
        }
    });

    // POST /api/v1/friends/respond — aceptar/rechazar
    fastify.post('/api/v1/friends/respond', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const { user_id, accept } = req.body || {};
        if (!user_id) return reply.code(400).send({ result: 'Failed', error: 'Missing user_id' });

        try {
            await accounts.respondFriendRequest(req.user.nexo_id, user_id, !!accept);
            return reply.send({ result: 'Success' });
        } catch (err) {
            return reply.code(400).send({ result: 'Failed', error: err.message });
        }
    });

    // DELETE /api/v1/friends/:user_id — eliminar amigo
    fastify.delete('/api/v1/friends/:user_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        try {
            await accounts.removeFriend(req.user.nexo_id, req.params.user_id);
            return reply.send({ result: 'Success' });
        } catch (err) {
            return reply.code(400).send({ result: 'Failed', error: err.message });
        }
    });

    // POST /api/v1/presence — actualizar estado en juego
    fastify.post('/api/v1/presence', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const { status, game_title, game_id } = req.body || {};
        await accounts.updatePresence(req.user.nexo_id, {
            status:     status    || 'online',
            game_title: game_title || null,
            game_id:    game_id   || null,
        });

        return reply.send({ result: 'Success' });
    });
}

module.exports = friendsApiRoutes;
