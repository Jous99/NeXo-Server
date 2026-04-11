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

async function smm2Routes(fastify) {

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

module.exports = smm2Routes;
