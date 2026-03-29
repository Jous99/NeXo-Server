'use strict';

/**
 * config-lp1.nexonetwork.space
 *
 * Visto en: src/yuzu/game_list.cpp
 *   httplib::SSLClient("config-lp1.raptor.network").Get("/api/v1/titles");
 *
 * El emulador descarga la lista de títulos compatibles/verificados
 * al arrancar para mostrar en el game list.
 */

const db = require('../../db');

async function configApiRoutes(fastify) {

    // GET /api/v1/titles — lista de títulos compatibles
    // El emulador espera un JSON array de title IDs y metadatos
    fastify.get('/api/v1/titles', async (req, reply) => {
        if (req.subdomain !== 'config-lp1' && req.subdomain !== 'www' && req.subdomain !== '') {
            return reply.code(404).send({ error: 'not found' });
        }

        // Devuelve la lista de juegos configurados en la DB, o un array vacío
        // En el futuro puedes poblar la tabla `titles` con los juegos soportados
        let titles = [];
        try {
            const [rows] = await db.query('SELECT title_id, name, compatibility FROM titles LIMIT 500');
            titles = rows;
        } catch {
            // Si la tabla no existe aún, devolvemos array vacío (no rompe el emulador)
            titles = [];
        }

        return reply.send({ result: 'Success', titles });
    });

    // GET /api/v1/config — configuración general del cliente
    fastify.get('/api/v1/config', async (req, reply) => {
        return reply.send({
            result:           'Success',
            telemetry_enabled: false,
            update_check:     false,
            motd:             process.env.MOTD || 'Welcome to NeXoNetwork.',
        });
    });
}

module.exports = configApiRoutes;
