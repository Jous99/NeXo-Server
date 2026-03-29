'use strict';

const accounts = require('../services/accounts');

const updateProfileSchema = {
    body: {
        type: 'object',
        properties: {
            nickname:   { type: 'string', minLength: 1, maxLength: 32 },
            avatar_url: { type: 'string', maxLength: 512 },
            lang:       { type: 'string', maxLength: 5 },
            region:     { type: 'string', maxLength: 32 },
        },
        additionalProperties: false,
    },
};

const changePasswordSchema = {
    body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
            currentPassword: { type: 'string' },
            newPassword:     { type: 'string', minLength: 8, maxLength: 128 },
        },
        additionalProperties: false,
    },
};

const presenceSchema = {
    body: {
        type: 'object',
        required: ['status'],
        properties: {
            status:     { type: 'string', enum: ['online', 'offline', 'in_game'] },
            game_title: { type: 'string', maxLength: 128 },
            game_id:    { type: 'string', maxLength: 32 },
        },
        additionalProperties: false,
    },
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function profileRoutes(fastify) {
    // All profile routes require authentication
    fastify.addHook('preHandler', fastify.authenticate);

    // GET /profile/me
    fastify.get('/me', async (req, reply) => {
        const profile = await accounts.getProfile(req.user.nexo_id);
        if (!profile) return reply.code(404).send({ ok: false, error: 'Not found' });
        return reply.send({ ok: true, data: profile });
    });

    // GET /profile/:nexo_id  (view another user's public profile)
    fastify.get('/:nexo_id', async (req, reply) => {
        const profile = await accounts.getProfile(req.params.nexo_id);
        if (!profile) return reply.code(404).send({ ok: false, error: 'User not found' });

        // Return only public fields
        const { nexo_id, nickname, avatar_url, online_status, game_title, last_seen, created_at } = profile;
        return reply.send({ ok: true, data: { nexo_id, nickname, avatar_url, online_status, game_title, last_seen, created_at } });
    });

    // PATCH /profile/me
    fastify.patch('/me', { schema: updateProfileSchema }, async (req, reply) => {
        const result = await accounts.updateProfile(req.user.nexo_id, req.body);
        return reply.send({ ok: true, data: result });
    });

    // POST /profile/me/change-password
    fastify.post('/me/change-password', { schema: changePasswordSchema }, async (req, reply) => {
        const result = await accounts.changePassword(req.user.nexo_id, req.body);
        return reply.send({ ok: true, data: result });
    });

    // PUT /profile/me/presence
    fastify.put('/me/presence', { schema: presenceSchema }, async (req, reply) => {
        const result = await accounts.updatePresence(req.user.nexo_id, req.body);
        return reply.send({ ok: true, data: result });
    });
}

module.exports = profileRoutes;
