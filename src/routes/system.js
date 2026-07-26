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
            // 11 min: el primer build de Go (descarga de módulos) puede pasar de
            // 2 min. El propio update.sh limita el build a 10 min por dentro.
            exec(`bash "${SCRIPT}"`, { cwd: ROOT, timeout: 660000 }, (err, stdout, stderr) => {
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

    // GET /admin/system/logs — logs del servidor
    //   ?source=server (por defecto) → salida REAL del proceso en PM2 (stdout + stderr)
    //   ?source=update               → log del script scripts/update.sh
    //   ?lines=N                     → nº de líneas (máx 500)
    fastify.get('/logs', async (req, reply) => {
        const n      = Math.min(Math.max(parseInt(req.query.lines || '80', 10) || 80, 1), 500);
        const source = req.query.source === 'update' ? 'update' : 'server';

        // Helper: ejecuta un comando y devuelve su stdout ('' si falla).
        const run = (cmd) => new Promise((res) =>
            exec(cmd, { cwd: ROOT, timeout: 10000, maxBuffer: 4 * 1024 * 1024 },
                 (e, out) => res(e ? '' : out))
        );

        // ── Log del script de actualización ───────────────────────────────────
        if (source === 'update') {
            const file = path.join(ROOT, 'logs', 'update.log');
            const logs = await run(`tail -n ${n} "${file}"`);
            return reply.send({ ok: true, data: { source, logs: logs || 'Sin logs todavía.' } });
        }

        // ── Logs REALES del proceso en marcha ─────────────────────────────────
        // 1) Fichero propio (logs/server.log) que el servidor escribe él mismo.
        //    Es la fuente principal: funciona SIN PM2.
        const selfFile = path.join(ROOT, 'logs', 'server.log');
        let logs = await run(`tail -n ${n} "${selfFile}"`);

        // 2) Fallback opcional: PM2, por si el proceso lleva corriendo desde antes
        //    de tener el log propio y PM2 sí está disponible.
        if (!logs.trim()) {
            const proc = process.env.PM2_APP_NAME || 'nexo-server';
            try {
                const found = JSON.parse(await run('pm2 jlist')).find((p) => p.name === proc);
                if (found && found.pm2_env) {
                    const [out, err] = await Promise.all([
                        found.pm2_env.pm_out_log_path ? run(`tail -n ${n} "${found.pm2_env.pm_out_log_path}"`) : Promise.resolve(''),
                        found.pm2_env.pm_err_log_path ? run(`tail -n ${n} "${found.pm2_env.pm_err_log_path}"`) : Promise.resolve(''),
                    ]);
                    logs = [
                        err.trim() && `── stderr ──\n${err.trim()}`,
                        out.trim() && `── stdout ──\n${out.trim()}`,
                    ].filter(Boolean).join('\n\n');
                }
            } catch { /* sin PM2 — no pasa nada, seguimos */ }
        }

        return reply.send({
            ok: true,
            data: {
                source,
                logs: logs.trim() ||
                    'Sin logs todavía. Reinicia el servidor una vez con el código nuevo ' +
                    'para que empiece a escribir en logs/server.log.',
            },
        });
    });
}

module.exports = systemRoutes;
