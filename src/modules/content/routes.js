'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  Módulo de contenido de la web:
//    - Ajustes del sitio (registros on/off + mensaje)
//    - Roadmap (hoja de ruta pública)
//    - Blog (noticias / entradas)
//
//  Rutas públicas:   /api/content/*
//  Rutas admin:      /api/content/admin/*   (requieren JWT de usuario con is_admin)
//
//  Se registra en server.js con prefix '/'.
// ─────────────────────────────────────────────────────────────────────────────

const db       = require('../../db');
const settings = require('../../services/settings');

// Genera un slug URL-safe a partir de un título.
function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 160) || 'post';
}

// Middleware admin: JWT válido + is_admin en la DB.
async function requireAdmin(request, reply) {
    await request.jwtVerify();
    const [rows] = await db.query('SELECT is_admin FROM users WHERE nexo_id = ?', [request.user.nexo_id]);
    if (!rows.length || !rows[0].is_admin) {
        return reply.code(403).send({ ok: false, error: 'Admin access required' });
    }
}

const ROADMAP_STATUSES = ['planned', 'in_progress', 'done'];

async function contentRoutes(fastify) {

    // ══════════════════════════════════════════════════════════════════════════
    //  PÚBLICO
    // ══════════════════════════════════════════════════════════════════════════

    // Estado de registros (para que la web/emulador sepa si mostrar el formulario)
    fastify.get('/api/content/registration-status', async (req, reply) => {
        return reply.send({
            ok:      true,
            enabled: await settings.registrationsEnabled(),
            message: await settings.registrationsClosedMessage(),
        });
    });

    // Roadmap público (ordenado)
    fastify.get('/api/content/roadmap', async (req, reply) => {
        const [rows] = await db.query(
            `SELECT id, title, description, status, sort_order, updated_at
             FROM roadmap_items ORDER BY sort_order ASC, id ASC`
        );
        return reply.send({ ok: true, data: rows });
    });

    // Blog público — solo publicados, sin el cuerpo completo (lista)
    fastify.get('/api/content/blog', async (req, reply) => {
        const [rows] = await db.query(
            `SELECT slug, title, summary, author, created_at
             FROM blog_posts WHERE published = TRUE ORDER BY created_at DESC`
        );
        return reply.send({ ok: true, data: rows });
    });

    // Un post por slug (solo publicado)
    fastify.get('/api/content/blog/:slug', async (req, reply) => {
        const [rows] = await db.query(
            `SELECT slug, title, summary, body, author, created_at, updated_at
             FROM blog_posts WHERE slug = ? AND published = TRUE`,
            [req.params.slug]
        );
        if (!rows.length) return reply.code(404).send({ ok: false, error: 'Post no encontrado' });
        return reply.send({ ok: true, data: rows[0] });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  ADMIN  (todo bajo /api/content/admin, protegido por requireAdmin)
    // ══════════════════════════════════════════════════════════════════════════
    fastify.register(async (admin) => {
        admin.addHook('preHandler', requireAdmin);

        // ── Ajustes ────────────────────────────────────────────────────────────
        admin.get('/api/content/admin/settings', async (req, reply) => {
            return reply.send({
                ok:   true,
                data: {
                    registrations_enabled:        await settings.registrationsEnabled(),
                    registrations_closed_message: await settings.registrationsClosedMessage(),
                },
            });
        });

        admin.put('/api/content/admin/settings', async (req, reply) => {
            const body = req.body || {};
            if (typeof body.registrations_enabled !== 'undefined') {
                await settings.set('registrations_enabled', body.registrations_enabled ? '1' : '0');
            }
            if (typeof body.registrations_closed_message === 'string') {
                await settings.set('registrations_closed_message', body.registrations_closed_message.slice(0, 500));
            }
            return reply.send({ ok: true });
        });

        // ── Roadmap CRUD ─────────────────────────────────────────────────────────
        admin.get('/api/content/admin/roadmap', async (req, reply) => {
            const [rows] = await db.query(
                `SELECT id, title, description, status, sort_order, created_at, updated_at
                 FROM roadmap_items ORDER BY sort_order ASC, id ASC`
            );
            return reply.send({ ok: true, data: rows });
        });

        admin.post('/api/content/admin/roadmap', async (req, reply) => {
            const { title, description, status, sort_order } = req.body || {};
            if (!title || !title.trim()) {
                return reply.code(400).send({ ok: false, error: 'El título es obligatorio' });
            }
            const st = ROADMAP_STATUSES.includes(status) ? status : 'planned';
            const [res] = await db.query(
                `INSERT INTO roadmap_items (title, description, status, sort_order)
                 VALUES (?, ?, ?, ?)`,
                [title.trim().slice(0, 160), description || null, st, parseInt(sort_order) || 0]
            );
            return reply.code(201).send({ ok: true, id: res.insertId });
        });

        admin.put('/api/content/admin/roadmap/:id', async (req, reply) => {
            const { title, description, status, sort_order } = req.body || {};
            const st = ROADMAP_STATUSES.includes(status) ? status : 'planned';
            const [res] = await db.query(
                `UPDATE roadmap_items SET title = ?, description = ?, status = ?, sort_order = ?
                 WHERE id = ?`,
                [(title || '').trim().slice(0, 160), description || null, st, parseInt(sort_order) || 0, req.params.id]
            );
            if (res.affectedRows === 0) return reply.code(404).send({ ok: false, error: 'No encontrado' });
            return reply.send({ ok: true });
        });

        admin.delete('/api/content/admin/roadmap/:id', async (req, reply) => {
            await db.query('DELETE FROM roadmap_items WHERE id = ?', [req.params.id]);
            return reply.send({ ok: true });
        });

        // ── Blog CRUD ────────────────────────────────────────────────────────────
        admin.get('/api/content/admin/blog', async (req, reply) => {
            const [rows] = await db.query(
                `SELECT id, slug, title, summary, author, published, created_at, updated_at
                 FROM blog_posts ORDER BY created_at DESC`
            );
            return reply.send({ ok: true, data: rows });
        });

        admin.get('/api/content/admin/blog/:id', async (req, reply) => {
            const [rows] = await db.query('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
            if (!rows.length) return reply.code(404).send({ ok: false, error: 'No encontrado' });
            return reply.send({ ok: true, data: rows[0] });
        });

        admin.post('/api/content/admin/blog', async (req, reply) => {
            const { title, summary, body, author, published } = req.body || {};
            if (!title || !title.trim()) return reply.code(400).send({ ok: false, error: 'El título es obligatorio' });
            if (!body  || !body.trim())  return reply.code(400).send({ ok: false, error: 'El contenido es obligatorio' });

            // slug único: si choca, le añade un sufijo numérico
            let base = slugify(title), slug = base, n = 1;
            while (true) {
                const [ex] = await db.query('SELECT id FROM blog_posts WHERE slug = ?', [slug]);
                if (!ex.length) break;
                slug = `${base}-${++n}`;
            }

            const [res] = await db.query(
                `INSERT INTO blog_posts (slug, title, summary, body, author, published)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [slug, title.trim().slice(0, 200), (summary || '').slice(0, 400) || null,
                 body, (author || '').slice(0, 64) || null, published === false ? 0 : 1]
            );
            return reply.code(201).send({ ok: true, id: res.insertId, slug });
        });

        admin.put('/api/content/admin/blog/:id', async (req, reply) => {
            const { title, summary, body, author, published } = req.body || {};
            const [res] = await db.query(
                `UPDATE blog_posts SET title = ?, summary = ?, body = ?, author = ?, published = ?
                 WHERE id = ?`,
                [(title || '').trim().slice(0, 200), (summary || '').slice(0, 400) || null,
                 body || '', (author || '').slice(0, 64) || null, published === false ? 0 : 1, req.params.id]
            );
            if (res.affectedRows === 0) return reply.code(404).send({ ok: false, error: 'No encontrado' });
            return reply.send({ ok: true });
        });

        admin.delete('/api/content/admin/blog/:id', async (req, reply) => {
            await db.query('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
            return reply.send({ ok: true });
        });
    });
}

module.exports = contentRoutes;
