'use strict';

/**
 * bcat-lp1.nexonetwork.space
 *
 * Visto en: src/core/hle/service/bcat/backend/boxcat.cpp
 *   constexpr char BOXCAT_HOSTNAME[] = "bcat-lp1.raptor.network";
 *
 * BCAT = Background Content Delivery ATtribute
 * La Switch usa BCAT para entregar contenido descargable en segundo plano:
 * noticias de juegos, datos de temporada, actualizaciones de eventos, etc.
 *
 * El emulador (Boxcat) es la implementación de BCAT de Yuzu/NeXo.
 * Por ahora devuelve respuestas vacías para que el emulador no falle.
 */

async function bcastRoutes(fastify) {

    // Todas las rutas BCAT — el emulador las llama con el ID de título
    // Formato: /api/v1/bcat/<title_id>/<data_type>

    // Lista de datos BCAT disponibles para un título
    fastify.get('/api/v1/bcat/:title_id', async (req, reply) => {
        if (req.subdomain !== 'bcat-lp1' && req.subdomain !== 'www' && req.subdomain !== '') {
            return reply.code(404).send({ error: 'not found' });
        }
        return reply.send({ result: 'Success', entries: [] });
    });

    // Descarga de datos BCAT específicos
    fastify.get('/api/v1/bcat/:title_id/:data_type', async (req, reply) => {
        if (req.subdomain !== 'bcat-lp1' && req.subdomain !== 'www' && req.subdomain !== '') {
            return reply.code(404).send({ error: 'not found' });
        }
        return reply.send({ result: 'Success', data: null });
    });

    // Health check para BCAT
    fastify.get('/api/v1/bcat/health', async (req, reply) => {
        return reply.send({ result: 'Success', status: 'operational' });
    });
}

module.exports = bcastRoutes;
