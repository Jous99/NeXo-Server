'use strict';

/**
 * notification-lp1.nexonetwork.space
 *
 * Visto en: src/core/online_initiator.cpp → NotificationUrl()
 * Maneja notificaciones push para el emulador (solicitudes de amistad,
 * mensajes, invitaciones a partida, etc.)
 */

async function notifApiRoutes(fastify) {

    // GET /api/v1/notifications — notificaciones pendientes del usuario
    fastify.get('/api/v1/notifications', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        // Por ahora devuelve lista vacía — implementar cuando haya sistema de notificaciones
        return reply.send({ result: 'Success', notifications: [] });
    });

    // POST /api/v1/notifications/ack — marcar notificación como leída
    fastify.post('/api/v1/notifications/ack', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        return reply.send({ result: 'Success' });
    });
}

module.exports = notifApiRoutes;
