'use strict';

/**
 * Nintendo Switch friends HTTP API
 *
 * Cuando la Switch real llama a friends.lp1.s.n.srv.nintendo.net,
 * el DNS la redirige a nexonetwork.space, que sirve estos endpoints.
 *
 * La Switch envía en los headers:
 *   Authorization: Bearer <baas_id_token>   (token que emitimos en /v1/Login)
 *   X-Nintendo-ServiceToken: <npln_token>
 *
 * Endpoints implementados (Nintendo friends HTTP API v1):
 *   GET    /v1/users/:pid/friends                  — lista de amigos
 *   GET    /v1/users/:pid/friend_requests/inbox     — solicitudes recibidas
 *   GET    /v1/users/:pid/friend_requests/outbox    — solicitudes enviadas
 *   POST   /v1/users/:pid/friend_requests           — enviar solicitud
 *   PATCH  /v1/users/:pid/friends/:their_pid        — actualizar amistad (aceptar)
 *   DELETE /v1/users/:pid/friends/:their_pid        — borrar amigo
 *   PUT    /v1/users/:pid/presence                  — actualizar presencia
 *   GET    /v1/users/:pid/presence                  — consultar presencia de otro
 *   POST   /v1/users/:pid/blocks                    — bloquear usuario
 *   DELETE /v1/users/:pid/blocks/:their_pid         — desbloquear usuario
 *
 * El "pid" de Nintendo equivale a nuestro nexo_id.
 * La Switch manda su nexo_id en el token JWT que nosotros emitimos.
 */

const db = require('../../db');

// Verificar el token BAAS que emitimos en /v1/Login
function verifyBaasToken(fastify, req) {
    const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
    if (!auth) return null;
    try {
        const payload = fastify.jwt.verify(auth);
        // Nuestro token BAAS tiene { type: 'baas_user', user_id, nintendo_account_id }
        return payload;
    } catch {
        return null;
    }
}

// Convierte un usuario de la DB al formato que espera la Switch
function toNintendoUser(u) {
    return {
        nsaId:             u.nexo_id,
        imageUri:          u.avatar_url || '',
        name:              u.nickname || u.username,
        presence: {
            state:         u.status === 'in_game' ? 'PLAYING' : (u.status === 'online' ? 'ONLINE' : 'OFFLINE'),
            updatedAt:     u.last_seen ? new Date(u.last_seen).toISOString() : new Date().toISOString(),
            game: u.game_title ? {
                name:      u.game_title,
                imageUri:  '',
                sysDescription: '',
            } : null,
        },
        isFriend:          true,
        isFavorite:        false,
        isNew:             false,
        coreFriendship:    { status: 'ESTABLISHED' },
    };
}

async function switchFriendsApiRoutes(fastify) {

    // ── GET /v1/users/:pid/friends ────────────────────────────────────────────
    // La Switch pide la lista de amigos al arrancar o abrir el menú.
    fastify.get('/v1/users/:pid/friends', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });

        const nexoId = req.params.pid;

        // Buscar el usuario propio
        const [self] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoId]).catch(() => [[]]);
        if (!self.length) return reply.code(404).send({ status: 404, errorCode: 'USER_NOT_FOUND' });
        const userId = self[0].id;

        // Obtener amigos aceptados con su presencia
        const [rows] = await db.query(`
            SELECT u.nexo_id, u.nickname, u.username, u.avatar_url,
                   p.status, p.game_title, p.last_seen
            FROM friends f
            JOIN users u ON (
                CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END = u.id
            )
            LEFT JOIN presence p ON p.user_id = u.id
            WHERE (f.requester_id = ? OR f.addressee_id = ?)
              AND f.status = 'accepted'
            ORDER BY p.status DESC, u.nickname ASC
        `, [userId, userId, userId]).catch(() => [[]]);

        return reply.send({
            friends: rows.map(toNintendoUser),
            friendCount: rows.length,
        });
    });

    // ── GET /v1/users/:pid/friend_requests/inbox ─────────────────────────────
    fastify.get('/v1/users/:pid/friend_requests/inbox', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });

        const nexoId = req.params.pid;
        const [self] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoId]).catch(() => [[]]);
        if (!self.length) return reply.code(404).send({ status: 404, errorCode: 'USER_NOT_FOUND' });

        const [rows] = await db.query(`
            SELECT u.nexo_id, u.nickname, u.username, u.avatar_url,
                   p.status, p.game_title, p.last_seen, f.created_at AS requested_at
            FROM friends f
            JOIN users u ON f.requester_id = u.id
            LEFT JOIN presence p ON p.user_id = u.id
            WHERE f.addressee_id = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `, [self[0].id]).catch(() => [[]]);

        return reply.send({
            friendRequests: rows.map(r => ({
                ...toNintendoUser(r),
                isFriend: false,
                coreFriendship: { status: 'PENDING_INCOMING' },
                requestedAt: r.requested_at,
            })),
        });
    });

    // ── GET /v1/users/:pid/friend_requests/outbox ─────────────────────────────
    fastify.get('/v1/users/:pid/friend_requests/outbox', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });

        const nexoId = req.params.pid;
        const [self] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoId]).catch(() => [[]]);
        if (!self.length) return reply.code(404).send({ status: 404, errorCode: 'USER_NOT_FOUND' });

        const [rows] = await db.query(`
            SELECT u.nexo_id, u.nickname, u.username, u.avatar_url,
                   p.status, p.game_title, p.last_seen, f.created_at AS requested_at
            FROM friends f
            JOIN users u ON f.addressee_id = u.id
            LEFT JOIN presence p ON p.user_id = u.id
            WHERE f.requester_id = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `, [self[0].id]).catch(() => [[]]);

        return reply.send({
            friendRequests: rows.map(r => ({
                ...toNintendoUser(r),
                isFriend: false,
                coreFriendship: { status: 'PENDING_OUTGOING' },
                requestedAt: r.requested_at,
            })),
        });
    });

    // ── POST /v1/users/:pid/friend_requests ───────────────────────────────────
    // La Switch envía: { targetNsaId: "nexo_id_del_otro" }
    fastify.post('/v1/users/:pid/friend_requests', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });

        const requesterNexoId = req.params.pid;
        const targetNexoId    = req.body?.targetNsaId || req.body?.nsaId;
        if (!targetNexoId) return reply.code(400).send({ status: 400, errorCode: 'MISSING_TARGET' });

        const [req_] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [requesterNexoId]).catch(() => [[]]);
        const [tgt]  = await db.query('SELECT id FROM users WHERE nexo_id = ?', [targetNexoId]).catch(() => [[]]);
        if (!req_.length || !tgt.length) return reply.code(404).send({ status: 404, errorCode: 'USER_NOT_FOUND' });

        // Comprobar si ya son amigos o hay solicitud pendiente
        const [existing] = await db.query(
            `SELECT id, status FROM friends
             WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
            [req_[0].id, tgt[0].id, tgt[0].id, req_[0].id]
        ).catch(() => [[]]);

        if (existing.length) {
            const s = existing[0].status;
            if (s === 'accepted') return reply.code(409).send({ status: 409, errorCode: 'ALREADY_FRIENDS' });
            if (s === 'pending')  return reply.code(409).send({ status: 409, errorCode: 'ALREADY_REQUESTED' });
        }

        await db.query(
            'INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, ?)',
            [req_[0].id, tgt[0].id, 'pending']
        ).catch(() => {});

        return reply.code(201).send({ status: 201, result: 'FRIEND_REQUEST_SENT' });
    });

    // ── PATCH /v1/users/:pid/friends/:their_pid ───────────────────────────────
    // Aceptar solicitud de amistad: { isFavorite: false }
    fastify.patch('/v1/users/:pid/friends/:their_pid', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });

        const myNexoId    = req.params.pid;
        const theirNexoId = req.params.their_pid;

        const [me]    = await db.query('SELECT id FROM users WHERE nexo_id = ?', [myNexoId]).catch(() => [[]]);
        const [them]  = await db.query('SELECT id FROM users WHERE nexo_id = ?', [theirNexoId]).catch(() => [[]]);
        if (!me.length || !them.length) return reply.code(404).send({ status: 404, errorCode: 'USER_NOT_FOUND' });

        // Aceptar solicitud donde YO soy el addressee
        const [res] = await db.query(
            `UPDATE friends SET status = 'accepted'
             WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
            [them[0].id, me[0].id]
        ).catch(() => [{ affectedRows: 0 }]);

        if (!res.affectedRows) return reply.code(404).send({ status: 404, errorCode: 'REQUEST_NOT_FOUND' });

        return reply.send({ status: 200, result: 'FRIEND_ACCEPTED' });
    });

    // ── DELETE /v1/users/:pid/friends/:their_pid ──────────────────────────────
    fastify.delete('/v1/users/:pid/friends/:their_pid', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });

        const myNexoId    = req.params.pid;
        const theirNexoId = req.params.their_pid;

        const [me]   = await db.query('SELECT id FROM users WHERE nexo_id = ?', [myNexoId]).catch(() => [[]]);
        const [them] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [theirNexoId]).catch(() => [[]]);
        if (!me.length || !them.length) return reply.code(404).send({ status: 404, errorCode: 'USER_NOT_FOUND' });

        await db.query(
            `DELETE FROM friends
             WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
            [me[0].id, them[0].id, them[0].id, me[0].id]
        ).catch(() => {});

        return reply.code(204).send();
    });

    // ── PUT /v1/users/:pid/presence ───────────────────────────────────────────
    // La Switch actualiza su presencia cuando entra/sale de un juego.
    // Body: { state: "PLAYING" | "ONLINE" | "OFFLINE", game: { name, titleId } }
    fastify.put('/v1/users/:pid/presence', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });

        const nexoId = req.params.pid;
        const { state, game } = req.body || {};

        const statusMap = { PLAYING: 'in_game', ONLINE: 'online', OFFLINE: 'offline' };
        const status    = statusMap[state] || 'online';
        const gameTitle = game?.name || null;

        const [self] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoId]).catch(() => [[]]);
        if (!self.length) return reply.code(404).send({ status: 404, errorCode: 'USER_NOT_FOUND' });

        await db.query(
            `UPDATE presence SET status = ?, game_title = ?, last_seen = NOW() WHERE user_id = ?`,
            [status, gameTitle, self[0].id]
        ).catch(() => {});

        return reply.send({ status: 200, result: 'PRESENCE_UPDATED' });
    });

    // ── GET /v1/users/:pid/presence ───────────────────────────────────────────
    fastify.get('/v1/users/:pid/presence', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });

        const nexoId = req.params.pid;
        const [rows] = await db.query(`
            SELECT p.status, p.game_title, p.last_seen, u.nickname, u.avatar_url
            FROM users u
            LEFT JOIN presence p ON p.user_id = u.id
            WHERE u.nexo_id = ?
        `, [nexoId]).catch(() => [[]]);

        if (!rows.length) return reply.code(404).send({ status: 404, errorCode: 'USER_NOT_FOUND' });
        const u = rows[0];

        const stateMap = { in_game: 'PLAYING', online: 'ONLINE', offline: 'OFFLINE' };
        return reply.send({
            nsaId: nexoId,
            presence: {
                state:     stateMap[u.status] || 'OFFLINE',
                updatedAt: u.last_seen ? new Date(u.last_seen).toISOString() : new Date().toISOString(),
                game: u.game_title ? { name: u.game_title } : null,
            },
        });
    });

    // ── POST /v1/users/:pid/blocks ────────────────────────────────────────────
    fastify.post('/v1/users/:pid/blocks', async (req, reply) => {
        // Stub — bloqueados se gestionan como amigos eliminados por ahora
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });
        return reply.code(201).send({ status: 201, result: 'BLOCKED' });
    });

    // ── DELETE /v1/users/:pid/blocks/:their_pid ───────────────────────────────
    fastify.delete('/v1/users/:pid/blocks/:their_pid', async (req, reply) => {
        const token = verifyBaasToken(fastify, req);
        if (!token) return reply.code(401).send({ status: 401, errorCode: 'UNAUTHORIZED' });
        return reply.code(204).send();
    });
}

module.exports = switchFriendsApiRoutes;
