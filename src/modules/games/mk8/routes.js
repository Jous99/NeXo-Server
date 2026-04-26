'use strict';

/**
 * mk8-lp1.nexonetwork.space
 *
 * Servidor para Mario Kart 8 Deluxe.
 * Gestiona salas online, tiempos de vuelta, rankings y torneos.
 *
 * Tablas en schema.sql:
 *   mk8_rooms, mk8_room_players, mk8_lap_times,
 *   mk8_race_results, mk8_player_stats, mk8_tournaments, mk8_tournament_players
 *
 * Endpoints:
 *  -- Salas --
 *   POST   /api/v1/mk8/rooms               — crear sala
 *   GET    /api/v1/mk8/rooms               — listar salas públicas
 *   GET    /api/v1/mk8/rooms/:code         — info de una sala
 *   POST   /api/v1/mk8/rooms/:code/join    — unirse a sala
 *   POST   /api/v1/mk8/rooms/:code/leave   — salir de sala
 *   POST   /api/v1/mk8/rooms/:code/result  — reportar resultado de carrera
 *   DELETE /api/v1/mk8/rooms/:code         — cerrar sala (solo host)
 *  -- Tiempos de vuelta --
 *   GET    /api/v1/mk8/laptimes/:track_id  — top tiempos de una pista
 *   POST   /api/v1/mk8/laptimes            — enviar mi tiempo
 *   GET    /api/v1/mk8/laptimes/me         — mis mejores tiempos
 *  -- Rankings --
 *   GET    /api/v1/mk8/rankings            — ranking global de jugadores
 *   GET    /api/v1/mk8/profile/:nexo_id    — estadísticas de un jugador
 *  -- Torneos --
 *   GET    /api/v1/mk8/tournaments         — listar torneos
 *   GET    /api/v1/mk8/tournaments/:id     — ver torneo + tabla de posiciones
 *   POST   /api/v1/mk8/tournaments/:id/join    — inscribirse
 *   POST   /api/v1/mk8/tournaments          (admin) — crear torneo
 */

const db = require('../../../db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isMk8Subdomain(req) {
    const sub = req.subdomain || '';
    return ['mk8-lp1', 'www', ''].includes(sub);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Helper: obtener user.id desde el token JWT
async function getUserId(nexo_id) {
    const [rows] = await db.query('SELECT id, is_admin FROM users WHERE nexo_id = ?', [nexo_id]);
    return rows.length ? rows[0] : null;
}

// Helper: actualizar o crear las estadísticas de un jugador
async function upsertStats(user_id, { races = 0, wins = 0, podiums = 0, points = 0 }) {
    await db.query(
        `INSERT INTO mk8_player_stats (user_id, races_played, wins, podiums, total_points)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           races_played  = races_played  + VALUES(races_played),
           wins          = wins          + VALUES(wins),
           podiums       = podiums       + VALUES(podiums),
           total_points  = total_points  + VALUES(total_points)`,
        [user_id, races, wins, podiums, points]
    );
}

// Puntos GP por posición (igual que Mario Kart 8 Deluxe)
const GP_POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

// ─── Plugin principal ─────────────────────────────────────────────────────────

async function mk8Routes(fastify) {

    // ══════════════════════════════════════════════════════════════════════════
    //  SALAS
    // ══════════════════════════════════════════════════════════════════════════

    // Crear sala
    fastify.post('/api/v1/mk8/rooms', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    name:        { type: 'string', maxLength: 64 },
                    max_players: { type: 'integer', minimum: 2, maximum: 12, default: 12 },
                    is_public:   { type: 'boolean', default: true },
                    ruleset: {
                        type: 'object',
                        properties: {
                            cc:        { type: 'string', enum: ['50cc','100cc','150cc','200cc'], default: '150cc' },
                            items:     { type: 'string', enum: ['all','shells_bananas','mushrooms_only','no_items'], default: 'all' },
                            laps:      { type: 'integer', minimum: 1, maximum: 7, default: 3 },
                            teams:     { type: 'boolean', default: false },
                        },
                    },
                },
                additionalProperties: false,
            },
        },
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const user = await getUserId(req.user.nexo_id);
        if (!user) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const { name, max_players = 12, is_public = true, ruleset = {} } = req.body || {};

        // Código único para la sala
        let room_code;
        for (let i = 0; i < 10; i++) {
            room_code = generateRoomCode();
            const [exists] = await db.query(
                "SELECT id FROM mk8_rooms WHERE room_code = ? AND status != 'finished'", [room_code]
            );
            if (!exists.length) break;
        }

        await db.query(
            `INSERT INTO mk8_rooms (room_code, host_id, name, max_players, is_public, ruleset)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [room_code, user.id, name || null, max_players, is_public, JSON.stringify(ruleset)]
        );

        // El host entra automáticamente
        const [room] = await db.query('SELECT id FROM mk8_rooms WHERE room_code = ?', [room_code]);
        await db.query('INSERT INTO mk8_room_players (room_id, user_id) VALUES (?, ?)', [room[0].id, user.id]);

        return reply.code(201).send({ result: 'Success', room_code, room_id: room[0].id });
    });

    // Listar salas públicas en estado "waiting"
    fastify.get('/api/v1/mk8/rooms', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [rooms] = await db.query(
            `SELECT r.room_code, r.name, r.status, r.max_players, r.ruleset, r.created_at,
                    u.nickname AS host_nickname, u.nexo_id AS host_nexo_id,
                    (SELECT COUNT(*) FROM mk8_room_players rp WHERE rp.room_id = r.id) AS player_count
             FROM mk8_rooms r
             JOIN users u ON u.id = r.host_id
             WHERE r.is_public = TRUE AND r.status = 'waiting'
             ORDER BY r.created_at DESC
             LIMIT 50`
        );
        return reply.send({ result: 'Success', data: rooms });
    });

    // Info de una sala
    fastify.get('/api/v1/mk8/rooms/:code', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [rooms] = await db.query(
            `SELECT r.id, r.room_code, r.name, r.status, r.max_players, r.is_public,
                    r.ruleset, r.created_at,
                    u.nickname AS host_nickname, u.nexo_id AS host_nexo_id
             FROM mk8_rooms r
             JOIN users u ON u.id = r.host_id
             WHERE r.room_code = ?`,
            [req.params.code.toUpperCase()]
        );
        if (!rooms.length) return reply.code(404).send({ result: 'Failed', error: 'Room not found' });

        const [players] = await db.query(
            `SELECT u.nexo_id, u.nickname
             FROM mk8_room_players rp
             JOIN users u ON u.id = rp.user_id
             WHERE rp.room_id = ?`,
            [rooms[0].id]
        );

        return reply.send({ result: 'Success', data: { ...rooms[0], players } });
    });

    // Unirse a una sala
    fastify.post('/api/v1/mk8/rooms/:code/join', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const user = await getUserId(req.user.nexo_id);
        if (!user) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [rooms] = await db.query(
            "SELECT id, max_players, status FROM mk8_rooms WHERE room_code = ? AND status = 'waiting'",
            [req.params.code.toUpperCase()]
        );
        if (!rooms.length) return reply.code(404).send({ result: 'Failed', error: 'Room not found or already started.' });

        const [[{ count }]] = await db.query(
            'SELECT COUNT(*) AS count FROM mk8_room_players WHERE room_id = ?', [rooms[0].id]
        );
        if (count >= rooms[0].max_players)
            return reply.code(400).send({ result: 'Failed', error: 'Room is full.' });

        // INSERT IGNORE — si ya está dentro no falla
        await db.query(
            'INSERT IGNORE INTO mk8_room_players (room_id, user_id) VALUES (?, ?)',
            [rooms[0].id, user.id]
        );
        return reply.send({ result: 'Success' });
    });

    // Salir de una sala
    fastify.post('/api/v1/mk8/rooms/:code/leave', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const user = await getUserId(req.user.nexo_id);
        if (!user) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [rooms] = await db.query('SELECT id, host_id FROM mk8_rooms WHERE room_code = ?', [req.params.code.toUpperCase()]);
        if (!rooms.length) return reply.code(404).send({ result: 'Failed', error: 'Room not found' });

        await db.query('DELETE FROM mk8_room_players WHERE room_id = ? AND user_id = ?', [rooms[0].id, user.id]);

        // Si el host se va y quedan jugadores, pasar el host al siguiente
        if (rooms[0].host_id === user.id) {
            const [remaining] = await db.query(
                'SELECT user_id FROM mk8_room_players WHERE room_id = ? LIMIT 1', [rooms[0].id]
            );
            if (remaining.length) {
                await db.query('UPDATE mk8_rooms SET host_id = ? WHERE id = ?', [remaining[0].user_id, rooms[0].id]);
            } else {
                // Sala vacía → cerrarla
                await db.query("UPDATE mk8_rooms SET status = 'finished', closed_at = NOW() WHERE id = ?", [rooms[0].id]);
            }
        }
        return reply.send({ result: 'Success' });
    });

    // Reportar resultado de una carrera
    fastify.post('/api/v1/mk8/rooms/:code/result', {
        schema: {
            body: {
                type: 'object',
                required: ['track_id', 'results'],
                properties: {
                    track_id: { type: 'string', maxLength: 64 },
                    // Array de { nexo_id, finish_pos, finish_time_ms }
                    results: {
                        type: 'array',
                        maxItems: 12,
                        items: {
                            type: 'object',
                            required: ['nexo_id', 'finish_pos'],
                            properties: {
                                nexo_id:        { type: 'string' },
                                finish_pos:     { type: 'integer', minimum: 1, maximum: 12 },
                                finish_time_ms: { type: 'integer', minimum: 0 },
                            },
                        },
                    },
                },
                additionalProperties: false,
            },
        },
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const host = await getUserId(req.user.nexo_id);
        if (!host) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [rooms] = await db.query(
            'SELECT id, host_id FROM mk8_rooms WHERE room_code = ?', [req.params.code.toUpperCase()]
        );
        if (!rooms.length) return reply.code(404).send({ result: 'Failed', error: 'Room not found' });
        if (rooms[0].host_id !== host.id)
            return reply.code(403).send({ result: 'Failed', error: 'Only the host can report results.' });

        const { track_id, results } = req.body;
        const room_id = rooms[0].id;

        for (const r of results) {
            const [u] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [r.nexo_id]);
            if (!u.length) continue;
            const uid = u[0].id;
            const points = GP_POINTS[r.finish_pos - 1] || 0;

            // Guardar resultado de carrera
            await db.query(
                `INSERT INTO mk8_race_results (room_id, track_id, user_id, finish_pos, finish_time, points)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [room_id, track_id, uid, r.finish_pos, r.finish_time_ms || null, points]
            );

            // Actualizar estadísticas
            await upsertStats(uid, {
                races:   1,
                wins:    r.finish_pos === 1 ? 1 : 0,
                podiums: r.finish_pos <= 3  ? 1 : 0,
                points,
            });

            // Actualizar tiempo de vuelta si es mejor
            if (r.finish_time_ms) {
                await db.query(
                    `INSERT INTO mk8_lap_times (user_id, track_id, time_ms)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                       time_ms     = IF(VALUES(time_ms) < time_ms, VALUES(time_ms), time_ms),
                       recorded_at = IF(VALUES(time_ms) < time_ms, NOW(), recorded_at)`,
                    [uid, track_id, r.finish_time_ms]
                );
            }

            // Actualizar puntos en torneos activos del jugador
            await db.query(
                `UPDATE mk8_tournament_players tp
                 JOIN mk8_tournaments t ON t.id = tp.tournament_id
                 SET tp.points = tp.points + ?
                 WHERE tp.user_id = ? AND t.status = 'in_progress'`,
                [points, uid]
            );
        }

        // Marcar sala como terminada
        await db.query(
            "UPDATE mk8_rooms SET status = 'finished', closed_at = NOW() WHERE id = ?", [room_id]
        );

        return reply.send({ result: 'Success' });
    });

    // Cerrar sala (solo host)
    fastify.delete('/api/v1/mk8/rooms/:code', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const user = await getUserId(req.user.nexo_id);
        if (!user) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [res] = await db.query(
            "UPDATE mk8_rooms SET status = 'finished', closed_at = NOW() WHERE room_code = ? AND host_id = ?",
            [req.params.code.toUpperCase(), user.id]
        );
        if (!res.affectedRows)
            return reply.code(403).send({ result: 'Failed', error: 'Room not found or you are not the host.' });

        return reply.send({ result: 'Success' });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  TIEMPOS DE VUELTA
    // ══════════════════════════════════════════════════════════════════════════

    // Top tiempos de una pista
    fastify.get('/api/v1/mk8/laptimes/:track_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const limit = Math.min(100, parseInt(req.query.limit || '25'));

        const [times] = await db.query(
            `SELECT u.nexo_id, u.nickname, t.time_ms, t.vehicle, t.recorded_at,
                    RANK() OVER (ORDER BY t.time_ms ASC) AS \`rank\`
             FROM mk8_lap_times t
             JOIN users u ON u.id = t.user_id
             WHERE t.track_id = ?
             ORDER BY t.time_ms ASC
             LIMIT ?`,
            [req.params.track_id, limit]
        );
        return reply.send({ result: 'Success', track_id: req.params.track_id, data: times });
    });

    // Enviar mi tiempo de vuelta
    fastify.post('/api/v1/mk8/laptimes', {
        schema: {
            body: {
                type: 'object',
                required: ['track_id', 'time_ms'],
                properties: {
                    track_id: { type: 'string', maxLength: 64 },
                    time_ms:  { type: 'integer', minimum: 1 },
                    vehicle:  { type: 'string', maxLength: 64 },
                },
                additionalProperties: false,
            },
        },
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const user = await getUserId(req.user.nexo_id);
        if (!user) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const { track_id, time_ms, vehicle } = req.body;

        await db.query(
            `INSERT INTO mk8_lap_times (user_id, track_id, time_ms, vehicle)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               time_ms     = IF(VALUES(time_ms) < time_ms, VALUES(time_ms), time_ms),
               vehicle     = IF(VALUES(time_ms) < time_ms, VALUES(vehicle), vehicle),
               recorded_at = IF(VALUES(time_ms) < time_ms, NOW(), recorded_at)`,
            [user.id, track_id, time_ms, vehicle || null]
        );
        return reply.send({ result: 'Success' });
    });

    // Mis mejores tiempos en todas las pistas
    fastify.get('/api/v1/mk8/laptimes/me', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const user = await getUserId(req.user.nexo_id);
        if (!user) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [times] = await db.query(
            'SELECT track_id, time_ms, vehicle, recorded_at FROM mk8_lap_times WHERE user_id = ? ORDER BY track_id',
            [user.id]
        );
        return reply.send({ result: 'Success', data: times });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  RANKINGS Y PERFIL
    // ══════════════════════════════════════════════════════════════════════════

    // Ranking global
    fastify.get('/api/v1/mk8/rankings', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const sort  = ['total_points','wins','races_played'].includes(req.query.sort)
                      ? req.query.sort : 'total_points';
        const limit = Math.min(100, parseInt(req.query.limit || '50'));

        const [rows] = await db.query(
            `SELECT u.nexo_id, u.nickname,
                    s.races_played, s.wins, s.podiums, s.total_points,
                    RANK() OVER (ORDER BY s.${sort} DESC) AS \`rank\`
             FROM mk8_player_stats s
             JOIN users u ON u.id = s.user_id
             ORDER BY s.${sort} DESC
             LIMIT ?`,
            [limit]
        );
        return reply.send({ result: 'Success', data: rows });
    });

    // Perfil de un jugador
    fastify.get('/api/v1/mk8/profile/:nexo_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [user] = await db.query(
            'SELECT id, nexo_id, nickname FROM users WHERE nexo_id = ?', [req.params.nexo_id]
        );
        if (!user.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [stats] = await db.query(
            'SELECT races_played, wins, podiums, total_points FROM mk8_player_stats WHERE user_id = ?',
            [user[0].id]
        );

        // Pista favorita (la que más veces ha jugado)
        const [fav] = await db.query(
            `SELECT track_id, COUNT(*) AS times_played
             FROM mk8_race_results WHERE user_id = ?
             GROUP BY track_id ORDER BY times_played DESC LIMIT 1`,
            [user[0].id]
        );

        // Mejor posición en cualquier pista
        const [best] = await db.query(
            `SELECT track_id, time_ms FROM mk8_lap_times
             WHERE user_id = ? ORDER BY time_ms ASC LIMIT 1`,
            [user[0].id]
        );

        return reply.send({
            result: 'Success',
            data: {
                nexo_id:        user[0].nexo_id,
                nickname:       user[0].nickname,
                stats:          stats[0] || { races_played: 0, wins: 0, podiums: 0, total_points: 0 },
                favorite_track: fav[0] || null,
                best_lap:       best[0] || null,
            },
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  TORNEOS
    // ══════════════════════════════════════════════════════════════════════════

    // Listar torneos
    fastify.get('/api/v1/mk8/tournaments', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const status = ['open','in_progress','finished'].includes(req.query.status)
                       ? req.query.status : 'open';

        const [rows] = await db.query(
            `SELECT t.id, t.name, t.description, t.max_players, t.status, t.starts_at, t.ends_at,
                    u.nexo_id AS host_nexo_id, u.nickname AS host_nickname,
                    (SELECT COUNT(*) FROM mk8_tournament_players tp WHERE tp.tournament_id = t.id) AS participant_count
             FROM mk8_tournaments t
             JOIN users u ON u.id = t.host_id
             WHERE t.status = ?
             ORDER BY t.starts_at ASC`,
            [status]
        );
        return reply.send({ result: 'Success', data: rows });
    });

    // Ver torneo + tabla de posiciones
    fastify.get('/api/v1/mk8/tournaments/:id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [tournaments] = await db.query(
            `SELECT t.id, t.name, t.description, t.max_players, t.status, t.starts_at, t.ends_at,
                    u.nexo_id AS host_nexo_id, u.nickname AS host_nickname
             FROM mk8_tournaments t
             JOIN users u ON u.id = t.host_id
             WHERE t.id = ?`,
            [req.params.id]
        );
        if (!tournaments.length)
            return reply.code(404).send({ result: 'Failed', error: 'Tournament not found' });

        // Tabla de posiciones
        const [leaderboard] = await db.query(
            `SELECT u.nexo_id, u.nickname, tp.points,
                    RANK() OVER (ORDER BY tp.points DESC) AS \`rank\`
             FROM mk8_tournament_players tp
             JOIN users u ON u.id = tp.user_id
             WHERE tp.tournament_id = ?
             ORDER BY tp.points DESC`,
            [req.params.id]
        );

        return reply.send({
            result: 'Success',
            data: { tournament: tournaments[0], leaderboard },
        });
    });

    // Inscribirse en un torneo
    fastify.post('/api/v1/mk8/tournaments/:id/join', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const user = await getUserId(req.user.nexo_id);
        if (!user) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [tournaments] = await db.query(
            "SELECT id, max_players FROM mk8_tournaments WHERE id = ? AND status = 'open'",
            [req.params.id]
        );
        if (!tournaments.length)
            return reply.code(404).send({ result: 'Failed', error: 'Tournament not found or not open.' });

        const [[{ count }]] = await db.query(
            'SELECT COUNT(*) AS count FROM mk8_tournament_players WHERE tournament_id = ?',
            [tournaments[0].id]
        );
        if (count >= tournaments[0].max_players)
            return reply.code(400).send({ result: 'Failed', error: 'Tournament is full.' });

        await db.query(
            'INSERT IGNORE INTO mk8_tournament_players (tournament_id, user_id) VALUES (?, ?)',
            [tournaments[0].id, user.id]
        );
        return reply.send({ result: 'Success' });
    });

    // Crear torneo (solo admin)
    fastify.post('/api/v1/mk8/tournaments', {
        schema: {
            body: {
                type: 'object',
                required: ['name', 'starts_at', 'ends_at'],
                properties: {
                    name:        { type: 'string', minLength: 1, maxLength: 128 },
                    description: { type: 'string', maxLength: 500 },
                    max_players: { type: 'integer', minimum: 2, maximum: 256, default: 64 },
                    starts_at:   { type: 'string' },
                    ends_at:     { type: 'string' },
                },
                additionalProperties: false,
            },
        },
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isMk8Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const user = await getUserId(req.user.nexo_id);
        if (!user || !user.is_admin)
            return reply.code(403).send({ result: 'Failed', error: 'Admin only.' });

        const { name, description, max_players = 64, starts_at, ends_at } = req.body;

        await db.query(
            `INSERT INTO mk8_tournaments (host_id, name, description, max_players, starts_at, ends_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user.id, name, description || '', max_players, starts_at, ends_at]
        );
        return reply.code(201).send({ result: 'Success' });
    });
}

module.exports = mk8Routes;
