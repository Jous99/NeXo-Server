'use strict';

const accounts = require('../services/accounts');

const friendRequestSchema = {
    body: {
        type: 'object',
        required: ['nexo_id'],
        properties: {
            nexo_id: { type: 'string' },
        },
        additionalProperties: false,
    },
};

const respondSchema = {
    params: {
        type: 'object',
        required: ['nexo_id'],
        properties: {
            nexo_id: { type: 'string' },
        },
    },
    body: {
        type: 'object',
        required: ['accept'],
        properties: {
            accept: { type: 'boolean' },
        },
        additionalProperties: false,
    },
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function friendsRoutes(fastify) {
    fastify.addHook('preHandler', fastify.authenticate);

    // GET /friends  — list friends + pending requests
    fastify.get('/', async (req, reply) => {
        const list = await accounts.getFriends(req.user.nexo_id);
        return reply.send({ ok: true, data: list });
    });

    // POST /friends/request  — send a friend request
    fastify.post('/request', { schema: friendRequestSchema }, async (req, reply) => {
        const result = await accounts.sendFriendRequest(req.user.nexo_id, req.body.nexo_id);
        return reply.code(201).send({ ok: true, data: result });
    });

    // PUT /friends/:nexo_id/respond  — accept or decline
    fastify.put('/:nexo_id/respond', { schema: respondSchema }, async (req, reply) => {
        const result = await accounts.respondFriendRequest(
            req.user.nexo_id,
            req.params.nexo_id,
            req.body.accept
        );
        return reply.send({ ok: true, data: result });
    });

    // DELETE /friends/:nexo_id  — remove friend
    fastify.delete('/:nexo_id', async (req, reply) => {
        const result = await accounts.removeFriend(req.user.nexo_id, req.params.nexo_id);
        return reply.send({ ok: true, data: result });
    });

    // POST /friends/:nexo_id/block
    fastify.post('/:nexo_id/block', async (req, reply) => {
        const result = await accounts.blockUser(req.user.nexo_id, req.params.nexo_id);
        return reply.send({ ok: true, data: result });
    });
}

module.exports = friendsRoutes;
