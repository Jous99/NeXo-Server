'use strict';

const accounts = require('../services/accounts');

const registerSchema = {
    body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
            username: { type: 'string', minLength: 3,  maxLength: 32,  pattern: '^[a-zA-Z0-9_]+$' },
            email:    { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8,  maxLength: 128 },
            nickname: { type: 'string', minLength: 1,  maxLength: 32 },
            lang:     { type: 'string', maxLength: 5 },
            region:   { type: 'string', maxLength: 32 },
        },
        additionalProperties: false,
    },
};

const loginSchema = {
    body: {
        type: 'object',
        required: ['login', 'password'],
        properties: {
            login:       { type: 'string' },
            password:    { type: 'string' },
            device_info: { type: 'string', maxLength: 255 },
        },
        additionalProperties: false,
    },
};

const refreshSchema = {
    body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
            refresh_token: { type: 'string', minLength: 64, maxLength: 64 },
        },
        additionalProperties: false,
    },
};

const logoutSchema = {
    body: {
        type: 'object',
        properties: {
            refresh_token: { type: 'string' },
        },
        additionalProperties: true,
    },
};

async function authRoutes(fastify) {

    // POST /auth/register
    fastify.post('/register', { schema: registerSchema }, async (req, reply) => {
        const result = await accounts.register(req.body);
        return reply.code(201).send({ ok: true, data: result });
    });

    // POST /auth/login
    fastify.post('/login', { schema: loginSchema }, async (req, reply) => {
        const { login, password, device_info } = req.body;
        const result = await accounts.login({ login, password, deviceInfo: device_info, ip: req.ip });

        const access_token = fastify.jwt.sign(
            { nexo_id: result.nexo_id, nickname: result.nickname },
            { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
        );

        return reply.send({
            ok: true,
            data: {
                access_token,
                refresh_token: result.refresh_token,
                nexo_id:       result.nexo_id,
                nickname:      result.nickname,
            },
        });
    });

    // POST /auth/refresh
    fastify.post('/refresh', { schema: refreshSchema }, async (req, reply) => {
        const { refresh_token } = req.body;
        const { nexo_id } = await accounts.refreshSession(refresh_token);
        const access_token = fastify.jwt.sign(
            { nexo_id },
            { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
        );
        return reply.send({ ok: true, data: { access_token } });
    });

    // POST /auth/logout
    fastify.post('/logout', {
        schema: logoutSchema,
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        const rt = req.body?.refresh_token;
        if (rt) await accounts.logout(rt);
        return reply.send({ ok: true });
    });

    // POST /auth/logout-all
    fastify.post('/logout-all', {
        preHandler: [fastify.authenticate],
    }, async (req, reply) => {
        await accounts.logoutAll(req.user.nexo_id);
        return reply.send({ ok: true });
    });
}

module.exports = authRoutes;
