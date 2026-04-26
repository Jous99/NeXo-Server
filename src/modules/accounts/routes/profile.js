'use strict';

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const accounts = require('../services/accounts');

// Directorio donde se guardan los avatares
const AVATARS_DIR = path.join(__dirname, '../../../..', 'uploads', 'avatars');
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE     = 3 * 1024 * 1024; // 3 MB

const updateProfileSchema = {
    body: {
        type: 'object',
        properties: {
            nickname:   { type: 'string', minLength: 1, maxLength: 32 },
            avatar_url: { type: 'string', maxLength: 512 },
            lang:       { type: 'string', maxLength: 5 },
            region:     { type: 'string', maxLength: 32 },
        },
        additionalProperties: false,
    },
};

const changePasswordSchema = {
    body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
            currentPassword: { type: 'string' },
            newPassword:     { type: 'string', minLength: 8, maxLength: 128 },
        },
        additionalProperties: false,
    },
};

const presenceSchema = {
    body: {
        type: 'object',
        required: ['status'],
        properties: {
            status:     { type: 'string', enum: ['online', 'offline', 'in_game'] },
            game_title: { type: 'string', maxLength: 128 },
            game_id:    { type: 'string', maxLength: 32 },
        },
        additionalProperties: false,
    },
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function profileRoutes(fastify) {
    // All profile routes require authentication
    fastify.addHook('preHandler', fastify.authenticate);

    // GET /profile/me
    fastify.get('/me', async (req, reply) => {
        const profile = await accounts.getProfile(req.user.nexo_id);
        if (!profile) return reply.code(404).send({ ok: false, error: 'Not found' });
        return reply.send({ ok: true, data: profile });
    });

    // GET /profile/:nexo_id  (view another user's public profile)
    fastify.get('/:nexo_id', async (req, reply) => {
        const profile = await accounts.getProfile(req.params.nexo_id);
        if (!profile) return reply.code(404).send({ ok: false, error: 'User not found' });

        // Return only public fields
        const { nexo_id, nickname, avatar_url, online_status, game_title, last_seen, created_at } = profile;
        return reply.send({ ok: true, data: { nexo_id, nickname, avatar_url, online_status, game_title, last_seen, created_at } });
    });

    // PATCH /profile/me
    fastify.patch('/me', { schema: updateProfileSchema }, async (req, reply) => {
        const result = await accounts.updateProfile(req.user.nexo_id, req.body);
        return reply.send({ ok: true, data: result });
    });

    // POST /profile/me/change-password
    fastify.post('/me/change-password', { schema: changePasswordSchema }, async (req, reply) => {
        const result = await accounts.changePassword(req.user.nexo_id, req.body);
        return reply.send({ ok: true, data: result });
    });

    // PUT /profile/me/presence
    fastify.put('/me/presence', { schema: presenceSchema }, async (req, reply) => {
        const result = await accounts.updatePresence(req.user.nexo_id, req.body);
        return reply.send({ ok: true, data: result });
    });

    // POST /profile/me/avatar  — subida de foto de perfil (multipart)
    fastify.post('/me/avatar', async (req, reply) => {
        const data = await req.file({ limits: { fileSize: MAX_SIZE } });
        if (!data) return reply.code(400).send({ ok: false, error: 'No se recibió ningún archivo' });

        if (!ALLOWED_MIME.has(data.mimetype)) {
            return reply.code(400).send({ ok: false, error: 'Solo se permiten imágenes JPEG, PNG, WebP o GIF' });
        }

        // Determinar extensión
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[data.mimetype];
        const nexo_id  = req.user.nexo_id;
        const filename = `${nexo_id}.${ext}`;
        const destPath = path.join(AVATARS_DIR, filename);

        // Borrar avatar anterior del mismo usuario (cualquier extensión)
        for (const old of fs.readdirSync(AVATARS_DIR)) {
            if (old.startsWith(`${nexo_id}.`) && old !== filename) {
                try { fs.unlinkSync(path.join(AVATARS_DIR, old)); } catch {}
            }
        }

        // Guardar el archivo
        const chunks = [];
        for await (const chunk of data.file) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        if (buffer.length > MAX_SIZE) {
            return reply.code(413).send({ ok: false, error: 'La imagen supera el límite de 3 MB' });
        }

        fs.writeFileSync(destPath, buffer);

        // Guardar URL en la base de datos (ruta pública del servidor)
        const avatar_url = `/avatars/${filename}?v=${Date.now()}`;
        await accounts.updateProfile(nexo_id, { avatar_url });

        return reply.send({ ok: true, avatar_url });
    });

    // GET /profile/avatars/:filename  — sirve los archivos de avatar
    fastify.get('/avatars/:filename', {
        config: { auth: false },
        schema: { hide: true },
    }, async (req, reply) => {
        // Seguridad: solo nombres de archivo simples, sin path traversal
        const filename = path.basename(req.params.filename);
        const filePath = path.join(AVATARS_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return reply.code(404).send({ ok: false, error: 'Not found' });
        }

        const ext = path.extname(filename).toLowerCase();
        const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
        const mime = mimeMap[ext] || 'application/octet-stream';

        return reply
            .header('Cache-Control', 'public, max-age=3600')
            .type(mime)
            .send(fs.createReadStream(filePath));
    });
}

module.exports = profileRoutes;
