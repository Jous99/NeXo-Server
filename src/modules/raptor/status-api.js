'use strict';

/**
 * status-lp1.nexonetwork.space
 *
 * El emulador (monitor.cpp) llama a estos endpoints para mostrar
 * el estado de conexión en la barra inferior:
 *
 *   GET /api/v1/status/general        → estado general del servidor
 *   GET /api/v1/status/client         → versión del cliente compatible
 *   GET /api/v1/status/token/standard → verifica el token del usuario
 *   GET /api/v1/status/title/:id      → soporte online del juego
 *
 * Códigos de estado que entiende el emulador (monitor.cpp STATUS_TABLE):
 *   0  → CONNECTED (verde)
 *   1  → PLANNED_MAINTENANCE
 *   2  → SERVER_DOWN
 *   3  → DEGRADED_PERFORMANCE
 *   4  → TAKEN_OFFLINE
 *   5  → PARTIAL_MAINTENANCE
 *   10 → GAME_NO_ONLINE  (juego no soportado)
 *   11 → CLIENT_NOT_SUPPORTED
 *   12 → CLIENT_OUTDATED
 *   50 → NO_MEMBERSHIP
 *   51 → LICENSE_NOT_ACCEPTED
 *   52 → INVALID_TOKEN
 *   53 → NOT_REGISTERED
 *  100-199 → TEMPORARY_BAN
 *  200-299 → PERMANENT_BAN
 */

// Juegos con online activo. Title IDs en hexadecimal (sin 0x).
// Mario Maker 2: 0100000000100000
const SUPPORTED_TITLES = new Set([
    '0100000000100000', // Super Mario Maker 2
]);

async function statusApiRoutes(fastify) {

    // ── GET /api/v1/status/general ────────────────────────────────────────────
    // monitor.cpp → UpdateMainServer()
    // Verifica que el servidor principal está activo.
    fastify.get('/api/v1/status/general', async (req, reply) => {
        return reply.send({ status: 0 }); // 0 = CONNECTED
    });

    // ── GET /api/v1/status/client ─────────────────────────────────────────────
    // monitor.cpp → UpdateMainServer()
    // Verifica que la versión del cliente es compatible.
    // El emulador manda: R-Client-Name, R-Client-Version
    fastify.get('/api/v1/status/client', async (req, reply) => {
        // Aceptamos cualquier versión de NeXoEmu
        const clientName = req.headers['r-client-name'] || '';
        if (clientName && !['nexoemu', 'yuzu', 'eden'].includes(clientName.toLowerCase())) {
            return reply.send({ status: 11 }); // CLIENT_NOT_SUPPORTED
        }
        return reply.send({ status: 0 }); // CONNECTED
    });

    // ── GET /api/v1/status/token/standard ────────────────────────────────────
    // monitor.cpp → UpdateUserStatus()
    // Verifica que el token JWT del usuario es válido.
    fastify.get('/api/v1/status/token/standard', async (req, reply) => {
        const bearer = (req.headers['authorization'] || '').replace('Bearer ', '');
        if (!bearer) {
            return reply.send({ status: 52 }); // INVALID_TOKEN
        }

        try {
            const payload = fastify.jwt.verify(bearer);

            // Verificar que el usuario no está baneado
            const db = require('../../db');
            const [rows] = await db.query(
                'SELECT is_banned FROM users WHERE nexo_id = ?',
                [payload.nexo_id]
            ).catch(() => [[]]);

            if (!rows.length) {
                return reply.send({ status: 53 }); // NOT_REGISTERED
            }
            if (rows[0].is_banned) {
                return reply.send({ status: 100 }); // TEMPORARY_BAN
            }

            return reply.send({ status: 0 }); // CONNECTED
        } catch {
            return reply.send({ status: 52 }); // INVALID_TOKEN
        }
    });

    // ── GET /api/v1/status/title/:title_id ───────────────────────────────────
    // monitor.cpp → UpdateGameServer()
    // Verifica si un juego concreto tiene online activo en NeXoNetwork.
    // El title_id llega en hex (ej: "100000000100000" para SMM2).
    fastify.get('/api/v1/status/title/:title_id', async (req, reply) => {
        const titleRaw = (req.params.title_id || '').toLowerCase().padStart(16, '0');

        // Comprobar en nuestra lista de títulos soportados
        if (SUPPORTED_TITLES.has(titleRaw)) {
            return reply.send({ status: 0 }); // CONNECTED
        }

        // También consultar la base de datos (por si se añadió dinámicamente)
        try {
            const db = require('../../db');
            const [rows] = await db.query(
                'SELECT compatibility FROM titles WHERE LOWER(title_id) = ?',
                [titleRaw]
            );
            // 'nothing' = juego no arranca = sin online. Los demás tienen online activo.
            if (rows.length && rows[0].compatibility !== 'nothing') {
                return reply.send({ status: 0 }); // CONNECTED
            }
        } catch {
            // Si la DB falla, devolvemos sin online por seguridad
        }

        return reply.send({ status: 10 }); // GAME_NO_ONLINE
    });

    // ── GET /api/v1/status (resumen general — web y health checks) ────────────
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

    // ── GET /api/v1/health ────────────────────────────────────────────────────
    fastify.get('/api/v1/health', async (req, reply) => {
        return reply.send({ result: 'Success', status: 'operational' });
    });
}

module.exports = statusApiRoutes;
