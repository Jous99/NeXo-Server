'use strict';

/**
 * Fastify hook — verifies the JWT access token and attaches
 * the decoded payload to request.user.
 *
 * Usage in routes:
 *   fastify.addHook('preHandler', authenticate);
 *   // or per-route:
 *   { preHandler: [fastify.authenticate] }
 */
async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
}

module.exports = { authenticate };
