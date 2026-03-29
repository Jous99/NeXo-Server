'use strict';

/**
 * profile-lp1.nexonetwork.space
 *
 * El emulador llama a este subdominio para:
 *   - Obtener el perfil del usuario logueado
 *   - Actualizar avatar, display name
 *
 * Visto en: src/core/online_initiator.cpp → ProfileApiUrl()
 */

const accounts = require('../accounts/services/accounts');

function isThisSubdomain(req) {
    return ['profile-lp1', 'www', ''].includes(req.subdomain || '');
}

async function profileApiRoutes(fastify) {

    // GET /api/v1/profile/me
    fastify.get('/api/v1/profile/me', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const profile = await accounts.getProfile(req.user.nexo_id);
        if (!profile) return reply.code(404).send({ result: 'Failed', error: 'Profile not found' });

        return reply.send({
            result:       'Success',
            user_id:      profile.nexo_id,
            display_name: profile.nickname,
            avatar_url:   profile.avatar_url || '',
            joined:       profile.created_at,
        });
    });

    // GET /api/v1/profile/:user_id
    fastify.get('/api/v1/profile/:user_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const profile = await accounts.getProfile(req.params.user_id);
        if (!profile) return reply.code(404).send({ result: 'Failed', error: 'Profile not found' });

        return reply.send({
            result:       'Success',
            user_id:      profile.nexo_id,
            display_name: profile.nickname,
            avatar_url:   profile.avatar_url || '',
        });
    });

    // PUT /api/v1/profile/me
    fastify.put('/api/v1/profile/me', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isThisSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const { display_name, avatar_url } = req.body || {};
        await accounts.updateProfile(req.user.nexo_id, {
            nickname:   display_name,
            avatar_url,
        });

        return reply.send({ result: 'Success' });
    });
}

module.exports = profileApiRoutes;
