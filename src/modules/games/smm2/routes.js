'use strict';

/**
 * smm2-lp1.nexonetwork.space
 *
 * Servidor para Super Mario Maker 2.
 * Gestiona el intercambio de cursos, miniaturas, estadísticas y comentarios.
 *
 * Columnas en schema.sql (columnas reales de la BD):
 *   smm2_courses : uploader_id, title, thumbnail  (NO user_id / name / thumbnail_data)
 *   smm2_comments: body                           (NO text)
 *   game_style   : ENUM('SMB','SMB3','SMW','NSMBU','SM3DW')   (NO 'SMB1')
 *
 * Endpoints:
 *   POST   /api/v1/smm2/courses               — subir un curso
 *   GET    /api/v1/smm2/courses               — buscar/listar cursos
 *   GET    /api/v1/smm2/courses/:id           — obtener datos de un curso
 *   GET    /api/v1/smm2/courses/:id/thumbnail — miniatura del curso
 *   DELETE /api/v1/smm2/courses/:id           — borrar un curso propio
 *   POST   /api/v1/smm2/courses/:id/clear     — registrar que completaste un curso
 *   POST   /api/v1/smm2/courses/:id/like      — dar like a un curso
 *   GET    /api/v1/smm2/courses/:id/comments  — ver comentarios
 *   POST   /api/v1/smm2/courses/:id/comments  — publicar un comentario
 *   GET    /api/v1/smm2/profile/:nexo_id      — perfil SMM2 de un jugador
 *   GET    /api/v1/smm2/rankings              — ranking global de cursos
 */

const db = require('../../../db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSmm2Subdomain(req) {
    const sub = req.subdomain || '';
    return ['smm2-lp1', 'www', ''].includes(sub);
}

// Genera un Course ID corto tipo SMM2: XXX-XXX-XXX
function generateCourseId() {
    const chars = 'BCDFGHJKLMNPQRSTVWXYZ23456789';
    const seg = (n) =>
        Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(3)}-${seg(3)}-${seg(3)}`;
}

// ─── Schemas de validación ────────────────────────────────────────────────────

const uploadSchema = {
    body: {
        type: 'object',
        required: ['title', 'course_data'],
        properties: {
            title:         { type: 'string',  minLength: 1,  maxLength: 60 },
            description:   { type: 'string',  maxLength: 200 },
            // game_style debe coincidir con el ENUM del schema
            game_style:    { type: 'string',  enum: ['SMB', 'SMB3', 'SMW', 'NSMBU', 'SM3DW'], default: 'SMB' },
            course_theme:  { type: 'string',  maxLength: 32 },
            difficulty:    { type: 'string',  enum: ['easy', 'normal', 'expert', 'super_expert'], default: 'normal' },
            course_data:   { type: 'string',  description: 'Base64-encoded course binary (course2.bcd)' },
            thumbnail:     { type: 'string',  description: 'Base64-encoded PNG thumbnail (opcional)' },
        },
        additionalProperties: false,
    },
};

const commentSchema = {
    body: {
        type: 'object',
        required: ['body'],
        properties: {
            // La columna en schema.sql se llama 'body', no 'text'
            body: { type: 'string', minLength: 1, maxLength: 200 },
        },
        additionalProperties: false,
    },
};

// ─── Plugin principal ─────────────────────────────────────────────────────────

async function smm2CoreRoutes(fastify) {

    // ── Subir un curso ────────────────────────────────────────────────────────
    fastify.post('/api/v1/smm2/courses', {
        schema: uploadSchema,
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const { title, description, game_style, course_theme, difficulty, course_data, thumbnail } = req.body;
        const nexo_id = req.user.nexo_id;

        // Obtener user.id desde nexo_id
        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const uploader_id = users[0].id;

        // Comprobar límite de cursos por usuario (máx. 100)
        const [[{ count }]] = await db.query(
            'SELECT COUNT(*) as count FROM smm2_courses WHERE uploader_id = ?', [uploader_id]
        );
        if (count >= 100) {
            return reply.code(400).send({ result: 'Failed', error: 'Course limit reached (100 max)' });
        }

        // Generar course_id único
        let course_id;
        let attempts = 0;
        do {
            course_id = generateCourseId();
            const [exists] = await db.query('SELECT id FROM smm2_courses WHERE course_id = ?', [course_id]);
            if (!exists.length) break;
            attempts++;
        } while (attempts < 10);

        // Guardar el curso.
        // La columna del uploader se llama 'uploader_id', el título 'title',
        // y la miniatura 'thumbnail' (MEDIUMBLOB). FROM_BASE64 convierte el string base64 a binario.
        await db.query(
            `INSERT INTO smm2_courses
             (course_id, uploader_id, title, description, game_style, course_theme, difficulty, course_data, thumbnail)
             VALUES (?, ?, ?, ?, ?, ?, ?, FROM_BASE64(?), FROM_BASE64(?))`,
            [
                course_id, uploader_id, title,
                description  || '',
                game_style   || 'SMB',
                course_theme || 'Overworld',
                difficulty   || 'normal',
                course_data,
                thumbnail || '',
            ]
        );

        return reply.code(201).send({
            result:    'Success',
            course_id,
            message:   'Course uploaded successfully',
        });
    });

    // ── Listar / buscar cursos ─────────────────────────────────────────────────
    fastify.get('/api/v1/smm2/courses', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const page       = Math.max(1, parseInt(req.query.page  || '1'));
        const limit      = Math.min(50, parseInt(req.query.limit || '20'));
        const offset     = (page - 1) * limit;
        const search     = req.query.q         || null;
        const game_style = req.query.game_style || null;
        const difficulty = req.query.difficulty || null;
        const sort       = ['newest', 'popular', 'clear_rate'].includes(req.query.sort)
                           ? req.query.sort : 'newest';

        let where = ['c.is_deleted = FALSE'];
        const params = [];

        if (search) {
            // Buscar tanto en title como en description
            where.push('(c.title LIKE ? OR c.description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (game_style) { where.push('c.game_style = ?'); params.push(game_style); }
        if (difficulty)  { where.push('c.difficulty = ?');  params.push(difficulty); }

        const orderMap = {
            newest:     'c.created_at DESC',
            popular:    'c.like_count DESC',
            clear_rate: '(c.clear_count / GREATEST(c.play_count, 1)) DESC',
        };

        // JOIN con uploader_id (no user_id). Seleccionamos 'title' (no 'name').
        const sql = `
            SELECT c.course_id, c.title, c.description, c.game_style, c.course_theme,
                   c.difficulty, c.play_count, c.clear_count, c.like_count,
                   c.created_at,
                   u.nexo_id AS author_nexo_id, u.nickname AS author_nickname
            FROM smm2_courses c
            JOIN users u ON u.id = c.uploader_id
            WHERE ${where.join(' AND ')}
            ORDER BY ${orderMap[sort]}
            LIMIT ? OFFSET ?
        `;
        params.push(limit, offset);

        const [courses] = await db.query(sql, params);
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM smm2_courses c WHERE ${where.join(' AND ')}`,
            params.slice(0, -2)
        );

        return reply.send({
            result:  'Success',
            data:    courses,
            meta:    { total, page, limit },
        });
    });

    // ── Obtener un curso ──────────────────────────────────────────────────────
    fastify.get('/api/v1/smm2/courses/:course_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [rows] = await db.query(
            `SELECT c.course_id, c.title, c.description, c.game_style, c.course_theme,
                    c.difficulty, c.play_count, c.clear_count, c.like_count, c.created_at,
                    TO_BASE64(c.course_data) AS course_data,
                    u.nexo_id AS author_nexo_id, u.nickname AS author_nickname
             FROM smm2_courses c
             JOIN users u ON u.id = c.uploader_id
             WHERE c.course_id = ? AND c.is_deleted = FALSE`,
            [req.params.course_id]
        );

        if (!rows.length) return reply.code(404).send({ result: 'Failed', error: 'Course not found' });

        // Registrar visualización
        await db.query(
            'UPDATE smm2_courses SET play_count = play_count + 1 WHERE course_id = ?',
            [req.params.course_id]
        );

        return reply.send({ result: 'Success', data: rows[0] });
    });

    // ── Miniatura del curso ───────────────────────────────────────────────────
    // La columna se llama 'thumbnail' en el schema (no 'thumbnail_data')
    fastify.get('/api/v1/smm2/courses/:course_id/thumbnail', async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [rows] = await db.query(
            'SELECT thumbnail FROM smm2_courses WHERE course_id = ? AND is_deleted = FALSE',
            [req.params.course_id]
        );

        if (!rows.length || !rows[0].thumbnail) {
            return reply.code(404).send({ result: 'Failed', error: 'Thumbnail not found' });
        }

        return reply
            .header('Content-Type', 'image/png')
            .send(rows[0].thumbnail);
    });

    // ── Borrar un curso propio ────────────────────────────────────────────────
    fastify.delete('/api/v1/smm2/courses/:course_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        // Comparamos con uploader_id (no user_id)
        const [res] = await db.query(
            'UPDATE smm2_courses SET is_deleted = TRUE WHERE course_id = ? AND uploader_id = ?',
            [req.params.course_id, users[0].id]
        );

        if (res.affectedRows === 0) {
            return reply.code(404).send({ result: 'Failed', error: 'Course not found or not yours' });
        }

        return reply.send({ result: 'Success' });
    });

    // ── Registrar clear ───────────────────────────────────────────────────────
    fastify.post('/api/v1/smm2/courses/:course_id/clear', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [course] = await db.query(
            'SELECT id FROM smm2_courses WHERE course_id = ? AND is_deleted = FALSE',
            [req.params.course_id]
        );
        if (!course.length) return reply.code(404).send({ result: 'Failed', error: 'Course not found' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        // Evitar contar el mismo clear dos veces del mismo usuario
        const [already] = await db.query(
            'SELECT id FROM smm2_clears WHERE course_id = ? AND user_id = ?',
            [course[0].id, users[0].id]
        );

        if (!already.length) {
            await db.query(
                'INSERT INTO smm2_clears (course_id, user_id) VALUES (?, ?)',
                [course[0].id, users[0].id]
            );
            await db.query(
                'UPDATE smm2_courses SET clear_count = clear_count + 1 WHERE id = ?',
                [course[0].id]
            );
        }

        return reply.send({ result: 'Success' });
    });

    // ── Like a un curso ───────────────────────────────────────────────────────
    fastify.post('/api/v1/smm2/courses/:course_id/like', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [course] = await db.query(
            'SELECT id FROM smm2_courses WHERE course_id = ? AND is_deleted = FALSE',
            [req.params.course_id]
        );
        if (!course.length) return reply.code(404).send({ result: 'Failed', error: 'Course not found' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [already] = await db.query(
            'SELECT id FROM smm2_likes WHERE course_id = ? AND user_id = ?',
            [course[0].id, users[0].id]
        );

        if (already.length) {
            // Toggle: quitar like
            await db.query(
                'DELETE FROM smm2_likes WHERE course_id = ? AND user_id = ?',
                [course[0].id, users[0].id]
            );
            await db.query(
                'UPDATE smm2_courses SET like_count = GREATEST(0, like_count - 1) WHERE id = ?',
                [course[0].id]
            );
            return reply.send({ result: 'Success', liked: false });
        } else {
            await db.query(
                'INSERT INTO smm2_likes (course_id, user_id) VALUES (?, ?)',
                [course[0].id, users[0].id]
            );
            await db.query(
                'UPDATE smm2_courses SET like_count = like_count + 1 WHERE id = ?',
                [course[0].id]
            );
            return reply.send({ result: 'Success', liked: true });
        }
    });

    // ── Comentarios ───────────────────────────────────────────────────────────
    fastify.get('/api/v1/smm2/courses/:course_id/comments', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const page   = Math.max(1, parseInt(req.query.page  || '1'));
        const limit  = Math.min(50, parseInt(req.query.limit || '20'));
        const offset = (page - 1) * limit;

        // La columna es 'body' en smm2_comments (no 'text')
        const [rows] = await db.query(
            `SELECT cm.id, cm.body, cm.created_at,
                    u.nexo_id AS author_nexo_id, u.nickname AS author_nickname
             FROM smm2_comments cm
             JOIN smm2_courses  c  ON c.id = cm.course_id
             JOIN users         u  ON u.id = cm.user_id
             WHERE c.course_id = ? AND c.is_deleted = FALSE
             ORDER BY cm.created_at DESC
             LIMIT ? OFFSET ?`,
            [req.params.course_id, limit, offset]
        );

        return reply.send({ result: 'Success', data: rows });
    });

    fastify.post('/api/v1/smm2/courses/:course_id/comments', {
        schema: commentSchema,
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [course] = await db.query(
            'SELECT id FROM smm2_courses WHERE course_id = ? AND is_deleted = FALSE',
            [req.params.course_id]
        );
        if (!course.length) return reply.code(404).send({ result: 'Failed', error: 'Course not found' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        // Insertar usando la columna 'body' (no 'text')
        await db.query(
            'INSERT INTO smm2_comments (course_id, user_id, body) VALUES (?, ?, ?)',
            [course[0].id, users[0].id, req.body.body]
        );

        return reply.code(201).send({ result: 'Success' });
    });

    // ── Perfil SMM2 de un jugador ─────────────────────────────────────────────
    fastify.get('/api/v1/smm2/profile/:nexo_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const [user] = await db.query(
            'SELECT id, nickname, nexo_id FROM users WHERE nexo_id = ?',
            [req.params.nexo_id]
        );
        if (!user.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        // Estadísticas de cursos subidos (uploader_id en lugar de user_id)
        const [[stats]] = await db.query(
            `SELECT
                COUNT(*)                                          AS courses_uploaded,
                COALESCE(SUM(play_count),  0)                    AS total_plays,
                COALESCE(SUM(clear_count), 0)                    AS total_clears,
                COALESCE(SUM(like_count),  0)                    AS total_likes
             FROM smm2_courses
             WHERE uploader_id = ? AND is_deleted = FALSE`,
            [user[0].id]
        );

        const [[clearStats]] = await db.query(
            `SELECT COUNT(*) AS courses_cleared
             FROM smm2_clears WHERE user_id = ?`,
            [user[0].id]
        );

        return reply.send({
            result: 'Success',
            data: {
                nexo_id:          user[0].nexo_id,
                nickname:         user[0].nickname,
                courses_uploaded: stats.courses_uploaded,
                total_plays:      stats.total_plays,
                total_clears:     stats.total_clears,
                total_likes:      stats.total_likes,
                courses_cleared:  clearStats.courses_cleared,
            },
        });
    });

    // ── Ranking global ────────────────────────────────────────────────────────
    fastify.get('/api/v1/smm2/rankings', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        if (!isSmm2Subdomain(req)) return reply.code(404).send({ error: 'not found' });

        const type  = ['popular', 'newest', 'clear_rate'].includes(req.query.type)
                      ? req.query.type : 'popular';
        const limit = Math.min(50, parseInt(req.query.limit || '20'));

        const orderMap = {
            popular:    'c.like_count DESC',
            newest:     'c.created_at DESC',
            clear_rate: '(c.clear_count / GREATEST(c.play_count, 1)) DESC',
        };

        // JOIN con uploader_id. Seleccionamos 'title' (no 'name').
        const [courses] = await db.query(
            `SELECT c.course_id, c.title, c.game_style, c.difficulty,
                    c.play_count, c.clear_count, c.like_count, c.created_at,
                    u.nexo_id AS author_nexo_id, u.nickname AS author_nickname
             FROM smm2_courses c
             JOIN users u ON u.id = c.uploader_id
             WHERE c.is_deleted = FALSE AND c.play_count > 0
             ORDER BY ${orderMap[type]}
             LIMIT ?`,
            [limit]
        );

        return reply.send({ result: 'Success', data: courses });
    });
}

// ══════════════════════════════════════════════════════════════════════════════
//  BOOKMARKS  (basado en OWC bookmark)
//  Cada usuario puede guardar cursos para jugar más tarde.
//
//  POST /api/v1/smm2/courses/:course_id/bookmark — toggle (añadir/quitar)
//  GET  /api/v1/smm2/bookmarks                   — mis cursos guardados
// ══════════════════════════════════════════════════════════════════════════════

async function smm2BookmarkRoutes(fastify) {

    // Toggle bookmark
    fastify.post('/api/v1/smm2/courses/:course_id/bookmark', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const user_id = users[0].id;

        const [course] = await db.query(
            'SELECT id FROM smm2_courses WHERE course_id = ? AND is_deleted = FALSE',
            [req.params.course_id]
        );
        if (!course.length) return reply.code(404).send({ result: 'Failed', error: 'Course not found' });
        const course_pk = course[0].id;

        const [already] = await db.query(
            'SELECT id FROM smm2_bookmarks WHERE course_id = ? AND user_id = ?',
            [course_pk, user_id]
        );

        if (already.length) {
            await db.query('DELETE FROM smm2_bookmarks WHERE course_id = ? AND user_id = ?', [course_pk, user_id]);
            return reply.send({ result: 'Success', bookmarked: false });
        } else {
            await db.query('INSERT INTO smm2_bookmarks (course_id, user_id) VALUES (?, ?)', [course_pk, user_id]);
            return reply.send({ result: 'Success', bookmarked: true });
        }
    });

    // Mis cursos guardados
    fastify.get('/api/v1/smm2/bookmarks', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const page   = Math.max(1, parseInt(req.query.page  || '1'));
        const limit  = Math.min(50, parseInt(req.query.limit || '20'));
        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `SELECT c.course_id, c.title, c.description, c.game_style, c.difficulty,
                    c.play_count, c.clear_count, c.like_count, c.created_at,
                    u.nexo_id AS author_nexo_id, u.nickname AS author_nickname,
                    b.created_at AS bookmarked_at
             FROM smm2_bookmarks b
             JOIN smm2_courses c ON c.id = b.course_id
             JOIN users        u ON u.id = c.uploader_id
             WHERE b.user_id = ? AND c.is_deleted = FALSE
             ORDER BY b.created_at DESC
             LIMIT ? OFFSET ?`,
            [users[0].id, limit, offset]
        );

        return reply.send({ result: 'Success', data: rows });
    });
}

// ══════════════════════════════════════════════════════════════════════════════
//  ENDLESS MODE  (basado en OWC current_endless_run + endless_level)
//  Cursos aleatorios por dificultad. Pierdes una vida por cada curso saltado.
//
//  GET  /api/v1/smm2/endless                    — estado (4 dificultades)
//  POST /api/v1/smm2/endless/:diff/start        — iniciar o reiniciar run
//  GET  /api/v1/smm2/endless/:diff/next         — siguiente curso de la cola
//  POST /api/v1/smm2/endless/:diff/clear        — reportar curso completado
//  POST /api/v1/smm2/endless/:diff/skip         — saltar (pierde una vida)
//  POST /api/v1/smm2/endless/:diff/exit         — salir y guardar progreso
// ══════════════════════════════════════════════════════════════════════════════

const ENDLESS_DIFFICULTIES = ['easy', 'normal', 'expert', 'super_expert'];
const ENDLESS_START_LIVES  = { easy: 5, normal: 4, expert: 3, super_expert: 3 };
const ENDLESS_QUEUE_SIZE   = 10;

async function smm2EndlessRoutes(fastify) {

    async function getOrCreateState(user_id, difficulty) {
        const [rows] = await db.query(
            'SELECT * FROM smm2_endless_state WHERE user_id = ? AND difficulty = ?',
            [user_id, difficulty]
        );
        if (rows.length) return rows[0];
        await db.query(
            `INSERT INTO smm2_endless_state (user_id, difficulty, run_id, lives, clears, is_active)
             VALUES (?, ?, 1, ?, 0, FALSE)`,
            [user_id, difficulty, ENDLESS_START_LIVES[difficulty]]
        );
        const [fresh] = await db.query(
            'SELECT * FROM smm2_endless_state WHERE user_id = ? AND difficulty = ?',
            [user_id, difficulty]
        );
        return fresh[0];
    }

    async function refillQueue(user_id, difficulty, run_id, current_max_pos) {
        const [courses] = await db.query(
            `SELECT id FROM smm2_courses
             WHERE difficulty = ? AND is_deleted = FALSE
               AND id NOT IN (
                   SELECT course_id FROM smm2_endless_queue
                   WHERE user_id = ? AND difficulty = ? AND run_id = ?
               )
             ORDER BY RAND() LIMIT ?`,
            [difficulty, user_id, difficulty, run_id, ENDLESS_QUEUE_SIZE]
        );
        if (!courses.length) return;
        const inserts = courses.map((c, i) => [user_id, difficulty, run_id, current_max_pos + i + 1, c.id]);
        await db.query(
            'INSERT INTO smm2_endless_queue (user_id, difficulty, run_id, position, course_id) VALUES ?',
            [inserts]
        );
    }

    // Estado actual (todas las dificultades)
    fastify.get('/api/v1/smm2/endless', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const result = {};
        for (const diff of ENDLESS_DIFFICULTIES) {
            const s = await getOrCreateState(users[0].id, diff);
            result[diff] = { is_active: s.is_active, lives: s.lives, clears: s.clears, start_lives: ENDLESS_START_LIVES[diff] };
        }
        return reply.send({ result: 'Success', data: result });
    });

    // Iniciar o reiniciar una run
    fastify.post('/api/v1/smm2/endless/:difficulty/start', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const diff = req.params.difficulty;
        if (!ENDLESS_DIFFICULTIES.includes(diff))
            return reply.code(400).send({ result: 'Failed', error: 'Invalid difficulty' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const user_id = users[0].id;

        const state = await getOrCreateState(user_id, diff);
        const new_run_id = (state.run_id || 1) + 1;

        await db.query('DELETE FROM smm2_endless_queue WHERE user_id = ? AND difficulty = ?', [user_id, diff]);
        await db.query(
            `UPDATE smm2_endless_state
             SET run_id = ?, lives = ?, clears = 0, is_active = TRUE, started_at = NOW()
             WHERE user_id = ? AND difficulty = ?`,
            [new_run_id, ENDLESS_START_LIVES[diff], user_id, diff]
        );
        await refillQueue(user_id, diff, new_run_id, 0);

        return reply.send({ result: 'Success', lives: ENDLESS_START_LIVES[diff], clears: 0 });
    });

    // Siguiente curso de la cola
    fastify.get('/api/v1/smm2/endless/:difficulty/next', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const diff = req.params.difficulty;
        if (!ENDLESS_DIFFICULTIES.includes(diff))
            return reply.code(400).send({ result: 'Failed', error: 'Invalid difficulty' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const user_id = users[0].id;

        const state = await getOrCreateState(user_id, diff);
        if (!state.is_active)
            return reply.code(400).send({ result: 'Failed', error: 'No active run. Use POST .../start first.' });

        const [[{ pending }]] = await db.query(
            'SELECT COUNT(*) AS pending FROM smm2_endless_queue WHERE user_id = ? AND difficulty = ? AND run_id = ? AND cleared = FALSE',
            [user_id, diff, state.run_id]
        );
        if (pending <= 3) {
            const [[{ max_pos }]] = await db.query(
                'SELECT COALESCE(MAX(position), 0) AS max_pos FROM smm2_endless_queue WHERE user_id = ? AND difficulty = ? AND run_id = ?',
                [user_id, diff, state.run_id]
            );
            await refillQueue(user_id, diff, state.run_id, max_pos);
        }

        const [next] = await db.query(
            `SELECT q.position, c.course_id, c.title, c.game_style, c.difficulty,
                    c.play_count, c.like_count, u.nickname AS author_nickname
             FROM smm2_endless_queue q
             JOIN smm2_courses c ON c.id = q.course_id
             JOIN users        u ON u.id = c.uploader_id
             WHERE q.user_id = ? AND q.difficulty = ? AND q.run_id = ? AND q.cleared = FALSE
             ORDER BY q.position ASC LIMIT 1`,
            [user_id, diff, state.run_id]
        );
        if (!next.length)
            return reply.code(404).send({ result: 'Failed', error: 'No courses available for this difficulty.' });

        return reply.send({ result: 'Success', data: next[0], lives: state.lives, clears: state.clears });
    });

    // Reportar clear
    fastify.post('/api/v1/smm2/endless/:difficulty/clear', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const diff = req.params.difficulty;
        if (!ENDLESS_DIFFICULTIES.includes(diff))
            return reply.code(400).send({ result: 'Failed', error: 'Invalid difficulty' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const user_id = users[0].id;

        const state = await getOrCreateState(user_id, diff);
        if (!state.is_active) return reply.code(400).send({ result: 'Failed', error: 'No active run.' });

        await db.query(
            `UPDATE smm2_endless_queue SET cleared = TRUE
             WHERE user_id = ? AND difficulty = ? AND run_id = ? AND cleared = FALSE
             ORDER BY position ASC LIMIT 1`,
            [user_id, diff, state.run_id]
        );
        const new_clears = state.clears + 1;
        await db.query(
            'UPDATE smm2_endless_state SET clears = ? WHERE user_id = ? AND difficulty = ?',
            [new_clears, user_id, diff]
        );
        return reply.send({ result: 'Success', clears: new_clears, lives: state.lives });
    });

    // Saltar curso (pierde vida)
    fastify.post('/api/v1/smm2/endless/:difficulty/skip', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const diff = req.params.difficulty;
        if (!ENDLESS_DIFFICULTIES.includes(diff))
            return reply.code(400).send({ result: 'Failed', error: 'Invalid difficulty' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const user_id = users[0].id;

        const state = await getOrCreateState(user_id, diff);
        if (!state.is_active) return reply.code(400).send({ result: 'Failed', error: 'No active run.' });

        const new_lives = Math.max(0, state.lives - 1);
        const game_over = new_lives === 0;

        await db.query(
            `UPDATE smm2_endless_queue SET cleared = TRUE
             WHERE user_id = ? AND difficulty = ? AND run_id = ? AND cleared = FALSE
             ORDER BY position ASC LIMIT 1`,
            [user_id, diff, state.run_id]
        );
        await db.query(
            'UPDATE smm2_endless_state SET lives = ?, is_active = ? WHERE user_id = ? AND difficulty = ?',
            [new_lives, game_over ? 0 : 1, user_id, diff]
        );
        return reply.send({ result: 'Success', lives: new_lives, game_over });
    });

    // Salir
    fastify.post('/api/v1/smm2/endless/:difficulty/exit', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const diff = req.params.difficulty;
        if (!ENDLESS_DIFFICULTIES.includes(diff))
            return reply.code(400).send({ result: 'Failed', error: 'Invalid difficulty' });

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        await db.query(
            'UPDATE smm2_endless_state SET is_active = FALSE WHERE user_id = ? AND difficulty = ?',
            [users[0].id, diff]
        );
        return reply.send({ result: 'Success' });
    });
}

// ══════════════════════════════════════════════════════════════════════════════
//  SUPER WORLDS  (basado en OWC world_map + world_map_level)
//  Cada usuario puede tener un mundo con hasta 8 de sus propios cursos.
//
//  GET    /api/v1/smm2/worlds              — listar mundos recientes
//  GET    /api/v1/smm2/worlds/:nexo_id     — ver el mundo de un usuario
//  POST   /api/v1/smm2/worlds              — crear o actualizar mi mundo
//  DELETE /api/v1/smm2/worlds              — borrar mi mundo
// ══════════════════════════════════════════════════════════════════════════════

async function smm2WorldRoutes(fastify) {

    const worldSchema = {
        body: {
            type: 'object',
            required: ['title', 'courses'],
            properties: {
                title:       { type: 'string', minLength: 1, maxLength: 128 },
                description: { type: 'string', maxLength: 400 },
                courses:     { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 },
            },
            additionalProperties: false,
        },
    };

    // Listar mundos recientes
    fastify.get('/api/v1/smm2/worlds', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const limit  = Math.min(30, parseInt(req.query.limit  || '20'));
        const offset = Math.max(0,  parseInt(req.query.offset || '0'));
        const [worlds] = await db.query(
            `SELECT w.id, w.title, w.description, w.created_at,
                    u.nexo_id AS owner_nexo_id, u.nickname AS owner_nickname,
                    (SELECT COUNT(*) FROM smm2_world_courses wc WHERE wc.world_id = w.id) AS course_count
             FROM smm2_worlds w
             JOIN users u ON u.id = w.owner_id
             ORDER BY w.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return reply.send({ result: 'Success', data: worlds });
    });

    // Ver el mundo de un usuario
    fastify.get('/api/v1/smm2/worlds/:nexo_id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const [owner] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.params.nexo_id]);
        if (!owner.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [world] = await db.query(
            'SELECT id, title, description, created_at FROM smm2_worlds WHERE owner_id = ?',
            [owner[0].id]
        );
        if (!world.length)
            return reply.code(404).send({ result: 'Failed', error: 'This user has no Super World.' });

        const [courses] = await db.query(
            `SELECT wc.position, c.course_id, c.title, c.game_style, c.difficulty,
                    c.play_count, c.clear_count, c.like_count
             FROM smm2_world_courses wc
             JOIN smm2_courses c ON c.id = wc.course_id
             WHERE wc.world_id = ? AND c.is_deleted = FALSE
             ORDER BY wc.position ASC`,
            [world[0].id]
        );
        return reply.send({ result: 'Success', data: { ...world[0], owner_nexo_id: req.params.nexo_id, courses } });
    });

    // Crear o actualizar mi mundo
    fastify.post('/api/v1/smm2/worlds', {
        schema: worldSchema,
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const { title, description, courses } = req.body;
        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const user_id = users[0].id;

        for (const cid of courses) {
            const [c] = await db.query(
                'SELECT id FROM smm2_courses WHERE course_id = ? AND uploader_id = ? AND is_deleted = FALSE',
                [cid, user_id]
            );
            if (!c.length)
                return reply.code(400).send({ result: 'Failed', error: `Course ${cid} not found or not yours.` });
        }

        await db.query(
            `INSERT INTO smm2_worlds (owner_id, title, description) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), updated_at = NOW()`,
            [user_id, title, description || '']
        );
        const [world] = await db.query('SELECT id FROM smm2_worlds WHERE owner_id = ?', [user_id]);
        const world_id = world[0].id;

        await db.query('DELETE FROM smm2_world_courses WHERE world_id = ?', [world_id]);
        const rows = [];
        for (let i = 0; i < courses.length; i++) {
            const [c] = await db.query('SELECT id FROM smm2_courses WHERE course_id = ?', [courses[i]]);
            rows.push([world_id, c[0].id, i + 1]);
        }
        if (rows.length)
            await db.query('INSERT INTO smm2_world_courses (world_id, course_id, position) VALUES ?', [rows]);

        return reply.code(201).send({ result: 'Success' });
    });

    // Borrar mi mundo
    fastify.delete('/api/v1/smm2/worlds', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });
        const [res] = await db.query('DELETE FROM smm2_worlds WHERE owner_id = ?', [users[0].id]);
        if (!res.affectedRows)
            return reply.code(404).send({ result: 'Failed', error: 'You have no Super World to delete.' });
        return reply.send({ result: 'Success' });
    });
}

// ══════════════════════════════════════════════════════════════════════════════
//  NINJI SPEED RUN EVENTS  (basado en OWC ninji_level + ninji_time)
//  El admin crea eventos de speed run con medallas. Los jugadores compiten.
//
//  GET  /api/v1/smm2/ninji                — listar eventos (?all=true = pasados)
//  GET  /api/v1/smm2/ninji/:id            — ver evento + leaderboard + mi tiempo
//  POST /api/v1/smm2/ninji/:id/submit     — enviar mi tiempo
//  POST /api/v1/smm2/ninji   (admin)      — crear evento
// ══════════════════════════════════════════════════════════════════════════════

async function smm2NinjiRoutes(fastify) {

    // Listar eventos
    fastify.get('/api/v1/smm2/ninji', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const where = req.query.all === 'true' ? '' : 'AND e.ends_at > NOW()';
        const [events] = await db.query(
            `SELECT e.id, e.name, e.gold_ms, e.silver_ms, e.bronze_ms, e.starts_at, e.ends_at,
                    c.course_id, c.title AS course_title, c.game_style,
                    (SELECT COUNT(*) FROM smm2_ninji_times t WHERE t.event_id = e.id) AS participants
             FROM smm2_ninji_events e
             JOIN smm2_courses c ON c.id = e.course_id
             WHERE c.is_deleted = FALSE ${where}
             ORDER BY e.ends_at ASC`
        );
        return reply.send({ result: 'Success', data: events });
    });

    // Ver evento + leaderboard
    fastify.get('/api/v1/smm2/ninji/:id', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const [events] = await db.query(
            `SELECT e.id, e.name, e.gold_ms, e.silver_ms, e.bronze_ms, e.starts_at, e.ends_at,
                    c.course_id, c.title AS course_title, c.game_style
             FROM smm2_ninji_events e
             JOIN smm2_courses c ON c.id = e.course_id
             WHERE e.id = ?`,
            [req.params.id]
        );
        if (!events.length) return reply.code(404).send({ result: 'Failed', error: 'Event not found' });

        const [leaderboard] = await db.query(
            `SELECT u.nexo_id, u.nickname, t.time_ms, t.submitted_at,
                    RANK() OVER (ORDER BY t.time_ms ASC) AS \`rank\`
             FROM smm2_ninji_times t
             JOIN users u ON u.id = t.user_id
             WHERE t.event_id = ?
             ORDER BY t.time_ms ASC LIMIT 100`,
            [req.params.id]
        );

        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        let my_time = null;
        if (users.length) {
            const [mine] = await db.query(
                'SELECT time_ms, submitted_at FROM smm2_ninji_times WHERE event_id = ? AND user_id = ?',
                [req.params.id, users[0].id]
            );
            if (mine.length) my_time = mine[0];
        }
        return reply.send({ result: 'Success', data: { event: events[0], leaderboard, my_time } });
    });

    // Enviar tiempo
    fastify.post('/api/v1/smm2/ninji/:id/submit', {
        schema: { body: { type: 'object', required: ['time_ms'], properties: { time_ms: { type: 'integer', minimum: 1 } } } },
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length) return reply.code(404).send({ result: 'Failed', error: 'User not found' });

        const [events] = await db.query(
            'SELECT id, gold_ms, silver_ms, bronze_ms FROM smm2_ninji_events WHERE id = ? AND starts_at <= NOW() AND ends_at >= NOW()',
            [req.params.id]
        );
        if (!events.length)
            return reply.code(404).send({ result: 'Failed', error: 'Event not found or not active.' });

        const { time_ms } = req.body;
        const ev = events[0];

        await db.query(
            `INSERT INTO smm2_ninji_times (event_id, user_id, time_ms) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
               time_ms      = IF(VALUES(time_ms) < time_ms, VALUES(time_ms), time_ms),
               submitted_at = IF(VALUES(time_ms) < time_ms, NOW(), submitted_at)`,
            [ev.id, users[0].id, time_ms]
        );

        let medal = null;
        if      (time_ms <= ev.gold_ms)   medal = 'gold';
        else if (time_ms <= ev.silver_ms) medal = 'silver';
        else if (time_ms <= ev.bronze_ms) medal = 'bronze';

        return reply.send({ result: 'Success', medal, time_ms });
    });

    // Crear evento (solo admin)
    fastify.post('/api/v1/smm2/ninji', {
        schema: {
            body: {
                type: 'object',
                required: ['course_id','name','gold_ms','silver_ms','bronze_ms','starts_at','ends_at'],
                properties: {
                    course_id: { type: 'string' }, name: { type: 'string' },
                    gold_ms: { type: 'integer' }, silver_ms: { type: 'integer' }, bronze_ms: { type: 'integer' },
                    starts_at: { type: 'string' }, ends_at: { type: 'string' },
                },
            },
        },
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const [users] = await db.query('SELECT id, is_admin FROM users WHERE nexo_id = ?', [req.user.nexo_id]);
        if (!users.length || !users[0].is_admin)
            return reply.code(403).send({ result: 'Failed', error: 'Admin only.' });

        const { course_id, name, gold_ms, silver_ms, bronze_ms, starts_at, ends_at } = req.body;
        const [course] = await db.query(
            'SELECT id FROM smm2_courses WHERE course_id = ? AND is_deleted = FALSE', [course_id]
        );
        if (!course.length) return reply.code(404).send({ result: 'Failed', error: 'Course not found' });

        await db.query(
            `INSERT INTO smm2_ninji_events (course_id, name, gold_ms, silver_ms, bronze_ms, starts_at, ends_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [course[0].id, name, gold_ms, silver_ms, bronze_ms, starts_at, ends_at]
        );
        return reply.code(201).send({ result: 'Success' });
    });
}

// ── Registro de todos los módulos SMM2 ────────────────────────────────────────
async function smm2Routes(fastify) {
    await smm2CoreRoutes(fastify);
    await smm2BookmarkRoutes(fastify);
    await smm2EndlessRoutes(fastify);
    await smm2WorldRoutes(fastify);
    await smm2NinjiRoutes(fastify);
}

module.exports = smm2Routes;
