'use strict';

/**
 * notification-lp1.nexonetwork.space
 *
 * Visto en: src/core/online_initiator.cpp → NotificationUrl()
 *           src/yuzu/online/notification_queue.cpp → StartSocket()
 *
 * El emulador conecta vía WebSocket a:
 *   wss://notification-lp1.{domain}/api/v1/notification  (singular)
 *
 * IMPORTANTE: el path del cliente es /api/v1/notification (singular),
 * no /api/v1/notifications (plural).
 */

// Mapa de conexiones activas: nexo_id → Set<WebSocket>
// Permite enviar notificaciones a usuarios específicos en el futuro.
const connections = new Map();

async function notifApiRoutes(fastify) {

    // ── WebSocket /api/v1/notification ────────────────────────────────────────
    // Esto es lo que el emulador espera: notification_queue.cpp → StartSocket()
    // El cliente envía headers de auth: { Authorization: "Bearer <token>" }
    fastify.get('/api/v1/notification', { websocket: true }, async (socket, req) => {
        // Verificar JWT de la conexión
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();

        let nexo_id = null;
        if (token) {
            try {
                const payload = fastify.jwt.verify(token);
                nexo_id = payload.nexo_id || null;
            } catch {
                // Token inválido — cerramos la conexión limpiamente
                socket.close(1008, 'Invalid token');
                return;
            }
        }

        // Registrar conexión
        if (nexo_id) {
            if (!connections.has(nexo_id)) {
                connections.set(nexo_id, new Set());
            }
            connections.get(nexo_id).add(socket);
        }

        // Ping/pong para mantener la conexión viva (el cliente tiene setPingInterval(10))
        socket.on('message', (msg) => {
            // El cliente no manda mensajes activos, pero respondemos a pings
            try {
                const data = JSON.parse(msg.toString());
                if (data.type === 'ping') {
                    socket.send(JSON.stringify({ type: 'pong' }));
                }
            } catch { /* ignorar mensajes no-JSON */ }
        });

        socket.on('close', () => {
            if (nexo_id && connections.has(nexo_id)) {
                connections.get(nexo_id).delete(socket);
                if (connections.get(nexo_id).size === 0) {
                    connections.delete(nexo_id);
                }
            }
        });

        socket.on('error', () => {
            // Silenciar errores de socket para no crashear el servidor
        });
    });

    // ── GET /api/v1/notifications (HTTP, plural) ─────────────────────────────
    // Ruta HTTP para obtener notificaciones pendientes (futura implementación)
    fastify.get('/api/v1/notifications', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        return reply.send({ result: 'Success', notifications: [] });
    });

    // ── POST /api/v1/notifications/ack ────────────────────────────────────────
    fastify.post('/api/v1/notifications/ack', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        return reply.send({ result: 'Success' });
    });
}

// Helper exportada: enviar una notificación push a un usuario conectado por WebSocket
// Uso: sendPushNotification(nexo_id, { type: 1, priority: 1, display_type: 0, properties: {...} })
function sendPushNotification(nexo_id, payload) {
    const sockets = connections.get(nexo_id);
    if (!sockets || sockets.size === 0) return false;
    const msg = JSON.stringify(payload);
    for (const socket of sockets) {
        try { socket.send(msg); } catch { /* ignorar sockets cerrados */ }
    }
    return true;
}

module.exports = notifApiRoutes;
module.exports.sendPushNotification = sendPushNotification;
