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

        // ── Logs REALES del proceso en marcha (vía PM2) ───────────────────────
        const proc = process.env.PM2_APP_NAME || 'nexo-server';

        // 1) Preguntar a PM2 dónde guarda los ficheros de log de este proceso.
        let outPath = '', errPath = '';
        try {
            const found = JSON.parse(await run('pm2 jlist')).find((p) => p.name === proc);
            if (found && found.pm2_env) {
                outPath = found.pm2_env.pm_out_log_path || '';
                errPath = found.pm2_env.pm_err_log_path || '';
            }
        } catch { /* PM2 no disponible o salida no-JSON — usamos el fallback */ }

        // 2) Leer las últimas líneas de stdout y stderr.
        let logs = '';
        if (outPath || errPath) {
            const [out, err] = await Promise.all([
                outPath ? run(`tail -n ${n} "${outPath}"`) : Promise.resolve(''),
                errPath ? run(`tail -n ${n} "${errPath}"`) : Promise.resolve(''),
            ]);
            logs = [
                err.trim() && `── stderr ──\n${err.trim()}`,
                out.trim() && `── stdout ──\n${out.trim()}`,
            ].filter(Boolean).join('\n\n');
        }

        // 3) Fallback: pedírselos directamente a pm2 logs.
        if (!logs.trim()) {
            logs = await run(`pm2 logs ${proc} --nostream --lines ${n}`);
        }

        return reply.send({
            ok: true,
            data: { source, logs: logs.trim() || 'Sin logs del servidor (¿está PM2 disponible?).' },
        });
    });
}

module.exports = systemRoutes;
