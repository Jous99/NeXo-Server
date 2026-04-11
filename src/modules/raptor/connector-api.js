'use strict';

/**
 * connector-lp1.nexonetwork.space
 *
 * También actúa como destino del captive-portal test de NIFM.
 * El emulador redirige ctest.cdn.nintendo.net → connector-lp1.
 * NIFM hace GET / o GET /generate_204 para verificar que hay internet.
 * Si no responde 200, NIFM devuelve error 2038-2306 y el juego no conecta.
 */

async function connectorRoutes(fastify) {

    // ── NIFM Captive Portal Test ──────────────────────────────────────────────
    // GET / y HEAD / se manejan en server.js para evitar rutas duplicadas.
    // El router principal detecta el subdominio connector-lp1 y responde 200 OK.

    // Algunos firmwares usan /generate_204 (como Android)
    fastify.get('/generate_204', async (req, reply) => {
        return reply.code(204).send();
    });

    // ctest usa también HEAD a veces
    fastify.head('/', async (req, reply) => {
        return reply.code(200).send();
    });

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
