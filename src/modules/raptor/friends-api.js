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
const { sendPushNotification } = require('./notification-api');

// Tipos de notificación (deben coincidir con el enum del emulador)
const NOTIF_TYPE_FRIEND_STATUS = 102;  // FriendStatus

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

        const nexo_id  = String(req.user.nexo_id);
        const { status, game_title, game_id } = req.body || {};
        const normalizedStatus = status || 'online';

        await accounts.updatePresence(nexo_id, {
            status:     normalizedStatus,
            game_title: game_title || null,
            game_id:    game_id   || null,
        });

        // Notificar en tiempo real a los amigos conectados cuando el usuario
        // empieza o deja de jugar. Esto activa el toast "X está jugando a Y".
        // Se hace async (sin await) para no bloquear la respuesta HTTP.
        _pushStatusToFriends(nexo_id, normalizedStatus, game_title || null).catch(() => {});

        return reply.send({ result: 'Success' });
    });
}

// ── Helper: empujar cambio de estado a los amigos del usuario ──────────────────
// status_code: "1" = in_game, "0" = offline/online (no muestra toast en el cliente)
async function _pushStatusToFriends(nexo_id, normalizedStatus, game_title) {
    // Obtener el perfil del usuario para saber su nombre y avatar
    const profile = await accounts.getProfile(nexo_id).catch(() => null);
    if (!profile) return;

    // Solo enviamos toast cuando el usuario empieza a jugar (in_game)
    // o cuando el juego cambia. Para offline/online simplemente mapeamos sin ruido.
    const status_code = normalizedStatus === 'in_game' ? '1' : '0';

    // Obtener la lista de amigos aceptados
    const friends = await accounts.getFriends(nexo_id).catch(() => []);

    const notification = {
        type:         NOTIF_TYPE_FRIEND_STATUS,
        priority:     1,   // Standard
        display_type: 0,   // OutOfGame
        properties: {
            player_avatar_url: profile.avatar_url || '',
            player_name:       profile.nickname   || nexo_id,
            status_code,
            status_title_name: game_title || '',
        },
    };

    for (const friend of friends) {
        if (friend.friendship_status !== 'accepted') continue;
        sendPushNotification(String(friend.nexo_id), notification);
    }
}

module.exports = friendsApiRoutes;
