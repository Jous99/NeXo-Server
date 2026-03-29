'use strict';

const db = require('../../../db');

// Very simple admin auth: check if the JWT user has is_admin = true in DB
async function requireAdmin(request, reply) {
    await request.jwtVerify();
    const [rows] = await db.query('SELECT is_admin FROM users WHERE nexo_id = ?', [request.user.nexo_id]);
    if (!rows.length || !rows[0].is_admin) {
        return reply.code(403).send({ ok: false, error: 'Admin access required' });
    }
}

async function adminRoutes(fastify) {

    fastify.addHook('preHandler', requireAdmin);

    // GET /admin/users — list all users with pagination
    fastify.get('/users', async (req, reply) => {
        const page  = parseInt(req.query.page  || '1');
        const limit = parseInt(req.query.limit || '50');
        const offset = (page - 1) * limit;

        const [users]  = await db.query(
            `SELECT nexo_id, username, email, nickname, avatar_url, is_banned, ban_reason,
                    is_admin, created_at, updated_at
             FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM users');

        return reply.send({ ok: true, data: users, meta: { total, page, limit } });
    });

    // GET /admin/users/:nexo_id
    fastify.get('/users/:nexo_id', async (req, reply) => {
        const [rows] = await db.query(
            `SELECT u.*, p.status as online_status, p.game_title, p.last_seen
             FROM users u LEFT JOIN presence p ON p.user_id = u.id
             WHERE u.nexo_id = ?`, [req.params.nexo_id]
        );
        if (!rows.length) return reply.code(404).send({ ok: false, error: 'Not found' });
        return reply.send({ ok: true, data: rows[0] });
    });

    // POST /admin/users/:nexo_id/ban
    fastify.post('/users/:nexo_id/ban', {
        schema: {
            body: {
                type: 'object',
                properties: { reason: { type: 'string', maxLength: 500 } },
                additionalProperties: false,
            }
        }
    }, async (req, reply) => {
        const { reason } = req.body || {};
        const [res] = await db.query(
            'UPDATE users SET is_banned = TRUE, ban_reason = ? WHERE nexo_id = ?',
            [reason || null, req.params.nexo_id]
        );
        if (res.affectedRows === 0) return reply.code(404).send({ ok: false, error: 'User not found' });
        // Revoke all sessions
        await db.query(
            'UPDATE sessions SET revoked = TRUE WHERE user_id = (SELECT id FROM users WHERE nexo_id = ?)',
            [req.params.nexo_id]
        );
        return reply.send({ ok: true });
    });

    // POST /admin/users/:nexo_id/unban
    fastify.post('/users/:nexo_id/unban', async (req, reply) => {
        const [res] = await db.query(
            'UPDATE users SET is_banned = FALSE, ban_reason = NULL WHERE nexo_id = ?',
            [req.params.nexo_id]
        );
        if (res.affectedRows === 0) return reply.code(404).send({ ok: false, error: 'User not found' });
        return reply.send({ ok: true });
    });

    // POST /admin/users/:nexo_id/promote — make admin
    fastify.post('/users/:nexo_id/promote', async (req, reply) => {
        await db.query('UPDATE users SET is_admin = TRUE WHERE nexo_id = ?', [req.params.nexo_id]);
        return reply.send({ ok: true });
    });

    // DELETE /admin/users/:nexo_id
    fastify.delete('/users/:nexo_id', async (req, reply) => {
        await db.query('DELETE FROM users WHERE nexo_id = ?', [req.params.nexo_id]);
        return reply.send({ ok: true });
    });

    // GET /admin/stats
    fastify.get('/stats', async (req, reply) => {
        const [[{ total_users }]]  = await db.query('SELECT COUNT(*) as total_users FROM users');
        const [[{ online_users }]] = await db.query("SELECT COUNT(*) as online_users FROM presence WHERE status != 'offline'");
        const [[{ in_game }]]      = await db.query("SELECT COUNT(*) as in_game FROM presence WHERE status = 'in_game'");
        const [[{ banned }]]       = await db.query('SELECT COUNT(*) as banned FROM users WHERE is_banned = TRUE');
        const [[{ sessions }]]     = await db.query('SELECT COUNT(*) as sessions FROM sessions WHERE revoked = FALSE AND expires_at > NOW()');

        return reply.send({
            ok: true,
            data: { total_users, online_users, in_game, banned, active_sessions: sessions }
        });
    });
}

module.exports = adminRoutes;
