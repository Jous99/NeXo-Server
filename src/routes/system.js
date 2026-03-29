'use strict';

const { exec } = require('child_process');
const path     = require('path');
const db       = require('../db');

const ROOT   = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts', 'update.sh');

async function requireAdmin(request, reply) {
    await request.jwtVerify();
    const [rows] = await db.query('SELECT is_admin FROM users WHERE nexo_id = ?', [request.user.nexo_id]);
    if (!rows.length || !rows[0].is_admin) {
        return reply.code(403).send({ ok: false, error: 'Admin access required' });
    }
}

async function systemRoutes(fastify) {

    fastify.addHook('preHandler', requireAdmin);

    // POST /admin/system/update — pull desde Forgejo y reinicia
    fastify.post('/update', async (req, reply) => {
        reply.send({ ok: true, message: 'Actualización iniciada. El servidor se reiniciará en unos segundos.' });
        setTimeout(() => {
            exec(`bash "${SCRIPT}"`, { cwd: ROOT, timeout: 120000 }, (err, stdout, stderr) => {
                if (err) fastify.log.error('Update error:', stderr);
                else     fastify.log.info('Update ok:', stdout.slice(-200));
            });
        }, 300);
    });

    // GET /admin/system/status — estado del servidor
    fastify.get('/status', async (req, reply) => {
        const mem = process.memoryUsage();

        const run = (cmd) => new Promise((res) =>
            exec(cmd, { cwd: ROOT }, (e, out) => res(e ? null : out.trim()))
        );

        const [hash, branch, lastCommit] = await Promise.all([
            run('git rev-parse --short HEAD'),
            run('git branch --show-current'),
            run('git log -1 --format="%s|||%ad" --date=short'),
        ]);

        const [msg, date] = (lastCommit || '|||').split('|||');

        return reply.send({
            ok: true,
            data: {
                version:    require('../../package.json').version,
                node:       process.version,
                uptime_sec: Math.round(process.uptime()),
                memory_mb:  Math.round(mem.rss / 1024 / 1024),
                env:        process.env.NODE_ENV || 'development',
                git: { hash, branch, commit_msg: msg, commit_date: date },
            },
        });
    });

    // GET /admin/system/logs — últimas líneas del log de update
    fastify.get('/logs', async (req, reply) => {
        const n    = Math.min(parseInt(req.query.lines || '60'), 200);
        const file = path.join(ROOT, 'logs', 'update.log');
        const logs = await new Promise((res) =>
            exec(`tail -n ${n} "${file}"`, (e, out) => res(e ? 'Sin logs todavía.' : out))
        );
        return reply.send({ ok: true, data: { logs } });
    });
}

module.exports = systemRoutes;
