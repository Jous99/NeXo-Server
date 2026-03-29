'use strict';

/**
 * connector-lp1.nexonetwork.space
 *
 * Visto en: src/core/online_initiator.cpp → ConnectorUrl()
 * Gestiona el relay/NAT traversal para conexiones P2P entre jugadores.
 * Por ahora devuelve respuestas stub — implementar con un servidor STUN/TURN
 * cuando se desarrolle el matchmaking.
 */

async function connectorRoutes(fastify) {

    // GET /api/v1/connector/config — obtener configuración de conexión
    fastify.get('/api/v1/connector/config', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        return reply.send({
            result: 'Success',
            // Cuando implementes STUN/TURN, pon aquí los servidores ICE
            stun_servers: [],
            turn_servers: [],
            relay_enabled: false,
        });
    });

    // POST /api/v1/connector/session — crear sesión de conexión
    fastify.post('/api/v1/connector/session', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        return reply.send({
            result:     'Success',
            session_id: null,
            message:    'Connector not yet implemented',
        });
    });
}

module.exports = connectorRoutes;
