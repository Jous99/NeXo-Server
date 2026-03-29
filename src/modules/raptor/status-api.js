'use strict';

/**
 * status-lp1.nexonetwork.space
 *
 * Visto en: src/core/online_initiator.cpp → TroubleshooterUrl()
 * El emulador consulta el estado de los servicios para mostrar
 * al usuario si algo está caído.
 */

async function statusApiRoutes(fastify) {

    fastify.get('/api/v1/status', async (req, reply) => {
        return reply.send({
            result:   'Success',
            services: {
                accounts:     'operational',
                profile:      'operational',
                friends:      'operational',
                config:       'operational',
                notification: 'operational',
                connector:    'operational',
                bcat:         'operational',
            },
            maintenance: false,
            message:     null,
        });
    });

    // Alias que algunos clientes usan
    fastify.get('/api/v1/health', async (req, reply) => {
        return reply.send({ result: 'Success', status: 'operational' });
    });
}

module.exports = statusApiRoutes;
