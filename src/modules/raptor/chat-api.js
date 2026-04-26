'use strict';

/**
 * chat-lp1.nexonetwork.space
 *
 * Sistema de mensajería de texto entre usuarios del emulador.
 * Soporta DMs (mensajes directos) y en el futuro salas de grupo.
 *
 * Transporte dual:
 *   - WebSocket  wss://chat-lp1.{domain}/api/v1/chat/ws   (entrega en tiempo real)
 *   - REST HTTP  /api/v1/chat/...                          (fallback / historial)
 *
 * Notificaciones:
 *   Cuando el destinatario no tiene la ventana de chat abierta, se le envía una
 *   notificación tipo 300 (ChatMessage) a través del WebSocket de notificaciones
 *   para que el emulador muestre un toast aunque ChatDialog esté cerrado.
 */

const { sendPushNotification } = require('./notification-api');

// Tipo de notificación 300 = ChatMessage (debe coincidir con la enum del emulador)
const NOTIF_TYPE_CHAT_MESSAGE = 300;

// ── Almacén en memoria ────────────────────────────────────────────────────────
// En producción esto debería ir a una base de datos.
// Aquí usamos Maps simples con límite por sala.

const MAX_MESSAGES_PER_ROOM = 100; // últimos N mensajes por sala

// roomId → Array<{ id, sender_id, sender_name, content, timestamp }>
const roomMessages = new Map();

// nexo_id (como String) → Set<WebSocket>  (conexiones activas por usuario)
const connections = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

// Room-ID canónico para DM entre dos usuarios (independiente del orden)
function dmRoomId(idA, idB) {
    const a = String(idA);
    const b = String(idB);
    return a < b ? `dm_${a}_${b}` : `dm_${b}_${a}`;
}

// Enviar un mensaje WebSocket a todos los sockets activos de un usuario
function pushToUser(userId, payload) {
    const sockets = connections.get(String(userId));
    if (!sockets) return;
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const ws of sockets) {
        try { ws.send(msg); } catch { /* ignorar sockets cerrados */ }
    }
}

// ── Rutas ─────────────────────────────────────────────────────────────────────
async function chatApiRoutes(fastify) {

    // ── WebSocket /api/v1/chat/ws ─────────────────────────────────────────────
    // El emulador se conecta aquí para recibir mensajes en tiempo real.
    // Autenticación: header Authorization: Bearer <raptor_token>
    fastify.get('/api/v1/chat/ws', { websocket: true }, async (socket, req) => {
        const authHeader = req.headers['authorization'] || '';
        // Los navegadores no pueden enviar headers en WebSocket, así que
        // aceptamos también el token como query param: ?token=<jwt>
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
            || (req.query && req.query.token) || '';

        let nexo_id = null;
        let nickname = 'Unknown';

        if (token) {
            try {
                const payload = fastify.jwt.verify(token);
                nexo_id  = String(payload.nexo_id);
                nickname = payload.nickname || nexo_id;
            } catch {
                socket.close(1008, 'Invalid token');
                return;
            }
        } else {
            socket.close(1008, 'Missing token');
            return;
        }

        // Registrar conexión
        if (!connections.has(nexo_id)) connections.set(nexo_id, new Set());
        connections.get(nexo_id).add(socket);

        // Responder a pings del cliente
        socket.on('message', (raw) => {
            try {
                const data = JSON.parse(raw.toString());
                if (data.type === 'ping') {
                    socket.send(JSON.stringify({ type: 'pong' }));
                }
            } catch { /* ignorar mensajes no-JSON */ }
        });

        socket.on('close', () => {
            if (nexo_id && connections.has(nexo_id)) {
                connections.get(nexo_id).delete(socket);
                if (connections.get(nexo_id).size === 0) connections.delete(nexo_id);
            }
        });

        socket.on('error', () => { /* silenciar para no crashear */ });
    });

    // ── POST /api/v1/chat/dm/:user_id — abrir / obtener sala DM ──────────────
    // El emulador llama a esto antes de enviar el primer mensaje a un amigo.
    fastify.post('/api/v1/chat/dm/:user_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const nexo_id   = String(req.user.nexo_id);
        const target_id = String(req.params.user_id);

        if (nexo_id === target_id) {
            return reply.code(400).send({ result: 'Failed', error: 'Cannot DM yourself' });
        }

        const room_id = dmRoomId(nexo_id, target_id);
        if (!roomMessages.has(room_id)) roomMessages.set(room_id, []);

        return reply.send({ result: 'Success', room_id });
    });

    // ── GET /api/v1/chat/rooms — listar salas activas del usuario ─────────────
    fastify.get('/api/v1/chat/rooms', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const nexo_id = String(req.user.nexo_id);
        const rooms = [];

        for (const [room_id, msgs] of roomMessages) {
            if (!room_id.startsWith('dm_')) continue;
            // El room_id tiene la forma "dm_<idA>_<idB>"
            const [, idA, idB] = room_id.split('_');
            if (idA !== nexo_id && idB !== nexo_id) continue;

            const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const other_id = idA === nexo_id ? idB : idA;
            rooms.push({
                room_id,
                other_user_id:  other_id,
                last_message:   last,
                unread_count:   0, // futuro: contador de no-leídos
                message_count:  msgs.length,
            });
        }

        // Ordenar por timestamp del último mensaje (más reciente primero)
        rooms.sort((a, b) => {
            const ta = a.last_message?.timestamp ?? 0;
            const tb = b.last_message?.timestamp ?? 0;
            return tb - ta;
        });

        return reply.send({ result: 'Success', rooms });
    });

    // ── GET /api/v1/chat/rooms/:room_id/messages — historial ─────────────────
    // ?since=<timestamp_ms>  →  sólo mensajes más nuevos que ese timestamp
    // ?limit=<n>             →  máximo N mensajes (default 50, max 100)
    fastify.get('/api/v1/chat/rooms/:room_id/messages', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const nexo_id = String(req.user.nexo_id);
        const { room_id } = req.params;

        // Verificar que el usuario pertenece a esta sala
        if (!_userInRoom(nexo_id, room_id)) {
            return reply.code(403).send({ result: 'Failed', error: 'Access denied' });
        }

        const since = req.query?.since ? parseInt(req.query.since, 10) : 0;
        const limit = Math.min(parseInt(req.query?.limit ?? '50', 10), 100);

        const all  = roomMessages.get(room_id) || [];
        const msgs = all.filter(m => m.timestamp > since).slice(-limit);

        return reply.send({ result: 'Success', messages: msgs });
    });

    // ── POST /api/v1/chat/rooms/:room_id/messages — enviar mensaje ────────────
    fastify.post('/api/v1/chat/rooms/:room_id/messages', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const nexo_id  = String(req.user.nexo_id);
        const nickname = req.user.nickname || nexo_id;
        const { room_id } = req.params;
        const { content } = req.body || {};

        // Validaciones básicas
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return reply.code(400).send({ result: 'Failed', error: 'Empty message content' });
        }
        if (content.length > 500) {
            return reply.code(400).send({ result: 'Failed', error: 'Message too long (max 500 characters)' });
        }

        if (!_userInRoom(nexo_id, room_id)) {
            return reply.code(403).send({ result: 'Failed', error: 'Access denied' });
        }

        const message = {
            id:          `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            sender_id:   nexo_id,
            sender_name: nickname,
            content:     content.trim(),
            timestamp:   Date.now(),
        };

        // Guardar el mensaje
        if (!roomMessages.has(room_id)) roomMessages.set(room_id, []);
        const msgs = roomMessages.get(room_id);
        msgs.push(message);
        // Sliding window: mantener sólo los últimos MAX mensajes
        if (msgs.length > MAX_MESSAGES_PER_ROOM) {
            msgs.splice(0, msgs.length - MAX_MESSAGES_PER_ROOM);
        }

        // Entregar en tiempo real a todos los participantes vía WebSocket de chat.
        // IMPORTANTE: no enviar al remitente por WS porque ya recibe el mensaje
        // en la respuesta HTTP del POST. Si se lo enviamos también por WS,
        // el mensaje se duplica en el frontend.
        const pushPayload = { type: 'chat_message', room_id, message };
        const [, idA, idB] = room_id.split('_'); // "dm_<idA>_<idB>"
        const recipientId = idA === nexo_id ? idB : idA;
        pushToUser(recipientId, pushPayload);

        // Si el destinatario no tiene el chat WebSocket abierto, enviarle un
        // toast de notificación a través del WebSocket de notificaciones (tipo 300).
        const recipientHasChatWs = connections.has(String(recipientId)) &&
                                   connections.get(String(recipientId)).size > 0;
        if (!recipientHasChatWs) {
            sendPushNotification(recipientId, {
                type:         NOTIF_TYPE_CHAT_MESSAGE,
                priority:     1,   // Standard
                display_type: 0,   // OutOfGame
                properties: {
                    sender_id:   nexo_id,
                    sender_name: nickname,
                    room_id,
                    content:     message.content.slice(0, 80), // preview truncado
                },
            });
        }

        return reply.code(201).send({ result: 'Success', message });
    });

    // ── DELETE /api/v1/chat/rooms/:room_id/messages/:message_id ──────────────
    // Sólo el remitente puede borrar su propio mensaje.
    fastify.delete('/api/v1/chat/rooms/:room_id/messages/:message_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const nexo_id = String(req.user.nexo_id);
        const { room_id, message_id } = req.params;

        if (!_userInRoom(nexo_id, room_id)) {
            return reply.code(403).send({ result: 'Failed', error: 'Access denied' });
        }

        const msgs = roomMessages.get(room_id);
        if (!msgs) return reply.code(404).send({ result: 'Failed', error: 'Room not found' });

        const idx = msgs.findIndex(m => m.id === message_id);
        if (idx === -1) return reply.code(404).send({ result: 'Failed', error: 'Message not found' });

        if (msgs[idx].sender_id !== nexo_id) {
            return reply.code(403).send({ result: 'Failed', error: 'Cannot delete others\' messages' });
        }

        msgs.splice(idx, 1);

        // Notificar a los participantes que el mensaje fue eliminado
        const [, idA, idB] = room_id.split('_');
        const deletePayload = { type: 'chat_message_deleted', room_id, message_id };
        pushToUser(idA, deletePayload);
        pushToUser(idB, deletePayload);

        return reply.send({ result: 'Success' });
    });
}

// ── Utilidades internas ───────────────────────────────────────────────────────

function _userInRoom(nexo_id, room_id) {
    if (!room_id.startsWith('dm_')) return false;
    const [, idA, idB] = room_id.split('_');
    return idA === nexo_id || idB === nexo_id;
}

module.exports = chatApiRoutes;
