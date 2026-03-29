'use strict';

const { exec } = require('child_process');
const path = require('path');
const db = require('../db');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const UPDATE_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'update.sh');

async function requireAdmin(request, reply) {
    await request.jwtVerify();
    const [rows] = await db.query('SELECT is_admin FROM users WHERE nexo_id = ?', [request.user.nexo_id]);
    if (!rows.length || !rows[0].is_admin) {
        return reply.code(403).send({ ok: false, error: 'Admin access required' });
    }
}

async function systemRoutes(fastify) {

    fastify.addHook('preHandler', requireAdmin);

    /**
     * POST /admin/system/update
     * Pulls latest code from Forgejo and restarts the server.
     * Called from the web admin panel.
     */
    fastify.post('/update', async (req, reply) => {
        // Send response immediately — the restart will kill this process
        reply.send({
            ok: true,
            message: 'Update started. The server will restart in a few seconds.',
        });

        // Run update script after responding
        setTimeout(() => {
            exec(`bash "${UPDATE_SCRIPT}"`, {
                cwd: PROJECT_ROOT,
                timeout: 120000,
            }, (err, stdout, stderr) => {
                if (err) {
                    fastify.log.error('Update failed:', err.message);
                    fastify.log.error('stderr:', stderr);
                } else {
                    fastify.log.info('Update completed:', stdout);
                }
            });
        }, 500);
    });

    /**
     * GET /admin/system/status
     * Returns current server status: version, uptime, git commit.
     */
    fastify.get('/status', async (req, reply) => {
        const uptime = process.uptime();
        const memory = process.memoryUsage();

        // Get current git commit
        const gitHash = await new Promise((resolve) => {
            exec('git rev-parse --short HEAD', { cwd: PROJECT_ROOT }, (err, stdout) => {
                resolve(err ? 'unknown' : stdout.trim());
            });
        });

        const gitBranch = await new Promise((resolve) => {
            exec('git branch --show-current', { cwd: PROJECT_ROOT }, (err, stdout) => {
                resolve(err ? 'unknown' : stdout.trim());
            });
        });

        const gitLog = await new Promise((resolve) => {
            exec('git log -1 --format="%s|%ad" --date=iso', { cwd: PROJECT_ROOT }, (err, stdout) => {
                if (err) return resolve({ message: 'unknown', date: null });
                const parts = stdout.trim().split('|');
                resolve({ message: parts[0], date: parts[1] });
            });
        });

        return reply.send({
            ok: true,
            data: {
                version:    process.env.npm_package_version || '1.0.0',
                node:       process.version,
                uptime_sec: Math.round(uptime),
                memory_mb:  Math.round(memory.rss / 1024 / 1024),
                git: {
                    hash:    gitHash,
                    branch:  gitBranch,
                    last_commit: gitLog,
                },
                env: process.env.NODE_ENV || 'development',
            },
        });
    });

    /**
     * GET /admin/system/logs
     * Returns last N lines of the update log.
     */
    fastify.get('/logs', async (req, reply) => {
        const lines = parseInt(req.query.lines || '50');
        const logFile = path.join(PROJECT_ROOT, 'logs', 'update.log');

        const content = await new Promise((resolve) => {
            exec(`tail -n ${lines} "${logFile}"`, (err, stdout) => {
                resolve(err ? 'No logs yet.' : stdout);
            });
        });

        return reply.send({ ok: true, data: { logs: content } });
    });
}

module.exports = systemRoutes;
