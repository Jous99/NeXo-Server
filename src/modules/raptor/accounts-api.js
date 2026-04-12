'use strict';

/**
 * accounts-api-lp1.nexonetwork.space
 *
 * El emulador (src/yuzu/online/monitor.cpp) conecta a este subdominio para:
 *   - Login / autenticación
 *   - Registro de cuenta
 *   - Refresh de token
 *   - Logout
 *
 * También citrus-api-lp1 usa este mismo handler para la API general.
 *
 * El cliente C++ usa httplib::SSLClient y espera respuestas JSON.
 */

const accounts = require('../accounts/services/accounts');

// Middleware: solo procesa si el host es accounts-api-lp1 o citrus-api-lp1
function isAccountsSubdomain(req) {
    const sub = req.subdomain || '';
    return ['accounts-api-lp1', 'citrus-api-lp1', 'www', ''].includes(sub);
}

async function accountsApiRoutes(fastify) {

    // ── Autenticación ─────────────────────────────────────────────────────────
    // El emulador hace POST /api/v1/auth/authenticate
    // Visto en: src/yuzu/online/monitor.cpp
    fastify.post('/api/v1/auth/authenticate', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const { username, password, token } = req.body || {};

        // El emulador puede mandar "token" (para re-auth) o username+password
        if (!username && !password && !token) {
            return reply.code(400).send({ error: 'Missing credentials' });
        }

        try {
            let result;
            if (token) {
                // Re-autenticación con token existente
                result = await accounts.refreshSession(token);
                const access_token = fastify.jwt.sign(
                    { nexo_id: result.nexo_id },
                    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
                );
                return reply.send({
                    result:    'Success',
                    token:     access_token,
                    user_id:   result.nexo_id,
                });
            }

            result = await accounts.login({
                login:      username,
                password,
                deviceInfo: req.body?.client_version || 'NeXoEmulator',
                ip:         req.ip,
            });

            const access_token = fastify.jwt.sign(
                { nexo_id: result.nexo_id, nickname: result.nickname },
                { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
            );

            return reply.send({
                result:        'Success',
                token:         access_token,
                refresh_token: result.refresh_token,
                user_id:       result.nexo_id,
                display_name:  result.nickname,
            });
        } catch (err) {
            return reply.code(401).send({ result: 'Failed', error: err.message });
        }
    });

    // Alias: algunos clientes usan /api/v1/user/authenticate
    fastify.post('/api/v1/user/authenticate', async (req, reply) => {
        req.url = '/api/v1/auth/authenticate';
        // Redirige internamente
        const { username, password } = req.body || {};
        if (!username || !password) return reply.code(400).send({ result: 'Failed', error: 'Missing credentials' });

        try {
            const result = await accounts.login({ login: username, password, deviceInfo: 'NeXoEmulator', ip: req.ip });
            const access_token = fastify.jwt.sign(
                { nexo_id: result.nexo_id, nickname: result.nickname },
                { expiresIn: '15m' }
            );
            return reply.send({
                result:        'Success',
                token:         access_token,
                refresh_token: result.refresh_token,
                user_id:       result.nexo_id,
                display_name:  result.nickname,
            });
        } catch (err) {
            return reply.code(401).send({ result: 'Failed', error: err.message });
        }
    });

    // ── Registro ──────────────────────────────────────────────────────────────
    fastify.post('/api/v1/auth/register', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const { username, password, email, display_name } = req.body || {};
        if (!username || !password || !email) {
            return reply.code(400).send({ result: 'Failed', error: 'Missing required fields' });
        }

        try {
            const result = await accounts.register({ username, email, password, nickname: display_name });
            return reply.code(201).send({ result: 'Success', user_id: result.nexo_id });
        } catch (err) {
            const code = err.code === 'CONFLICT' ? 409 : 400;
            return reply.code(code).send({ result: 'Failed', error: err.message });
        }
    });

    // ── Refresh token ─────────────────────────────────────────────────────────
    fastify.post('/api/v1/auth/refresh', async (req, reply) => {
        const raw = req.body?.refresh_token || req.headers['x-refresh-token'];
        if (!raw) return reply.code(400).send({ result: 'Failed', error: 'Missing refresh token' });

        try {
            const { nexo_id } = await accounts.refreshSession(raw);
            const token = fastify.jwt.sign({ nexo_id }, { expiresIn: '15m' });
            return reply.send({ result: 'Success', token });
        } catch (err) {
            return reply.code(401).send({ result: 'Failed', error: err.message });
        }
    });

    // ── Logout ────────────────────────────────────────────────────────────────
    fastify.post('/api/v1/auth/logout', async (req, reply) => {
        const raw = req.body?.refresh_token;
        if (raw) await accounts.logout(raw).catch(() => {});
        return reply.send({ result: 'Success' });
    });

    // ── Info del servidor (citrus-api-lp1) ────────────────────────────────────
    // Visto en: src/yuzu/configuration/config.cpp
    // web_api_url = "https://citrus-api-lp1.raptor.network"
    fastify.get('/api/v1/server/info', async (req, reply) => {
        return reply.send({
            result:      'Success',
            name:        'NeXoNetwork',
            version:     require('../../../package.json').version,
            motd:        process.env.MOTD || 'Welcome to NeXoNetwork — Open Switch Online.',
            maintenance: false,
        });
    });

    // Telemetry opt-in (el emulador lo llama al iniciar)
    fastify.post('/api/v1/telemetry', async (req, reply) => {
        return reply.send({ result: 'Success' });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  ENDPOINTS CRÍTICOS — Llamados por core/online_initiator.cpp
    // ══════════════════════════════════════════════════════════════════════════

    // GET /api/v1/client/account_id
    // online_initiator.cpp → LoadAccountId()
    // El emulador espera el nexo_id como hex en el body (texto plano).
    // Ejemplo de respuesta: "1a2b3c4d"
    fastify.get('/api/v1/client/account_id', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const bearer = (req.headers['authorization'] || '').replace('Bearer ', '');
        if (!bearer) {
            return reply.code(401).header('R-ClearClientToken', '1').send('');
        }

        let payload;
        try {
            payload = fastify.jwt.verify(bearer);
        } catch {
            return reply.code(401).header('R-ClearClientToken', '1').send('');
        }

        // Devolver el ID interno como hex (el emulador lo parsea con stoull(..., 16))
        // Usamos el hash numérico del nexo_id para obtener un u64 estable
        const nexo_id = payload.nexo_id || '';
        const db = require('../../db');
        const [rows] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexo_id]);
        if (!rows.length) {
            return reply.code(401).header('R-ClearClientToken', '1').send('');
        }
        const numericId = rows[0].id;
        return reply.type('text/plain').send(numericId.toString(16));
    });

    // POST /api/v1/client/login
    // online_initiator.cpp → LoadIdTokenInternal()
    // El emulador manda:
    //   R-TitleId: <hex title id>   → token de juego
    //   R-Target:  <app_name>       → token de app (config, notification, etc.)
    // Responde con el JWT en el body (texto plano).
    fastify.post('/api/v1/client/login', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const bearer = (req.headers['authorization'] || '').replace('Bearer ', '');
        if (!bearer) {
            return reply.code(401).header('R-ClearClientToken', '1').send('');
        }

        let payload;
        try {
            payload = fastify.jwt.verify(bearer);
        } catch {
            return reply.code(401).header('R-ClearClientToken', '1').send('');
        }

        const titleId = req.headers['r-titleid'] || null;
        const target  = req.headers['r-target']  || null;

        // Verificar que el usuario no está baneado
        const db = require('../../db');
        const [rows] = await db.query('SELECT id, is_banned FROM users WHERE nexo_id = ?', [payload.nexo_id]);
        if (!rows.length || rows[0].is_banned) {
            return reply.code(403).send('');
        }

        // Si mandan un R-TitleId, verificar que ese juego tiene online activo.
        // El emulador envía el title_id en formato {:X} (hex sin relleno, p.ej. "100000000100000")
        // pero en la DB está guardado con 16 dígitos ("0100000000100000").
        // padStart(16, '0') normaliza ambos formatos.
        if (titleId) {
            const titleIdPadded = titleId.toLowerCase().padStart(16, '0');
            const [titleRows] = await db.query(
                'SELECT compatibility FROM titles WHERE LOWER(title_id) = ?',
                [titleIdPadded]
            ).catch(() => [[]]);

            // Si el juego no está en la tabla, devolvemos 400 (sin online)
            if (!titleRows.length) {
                return reply.code(400).send('');
            }
        }

        // Generar un token específico para el juego/app
        const tokenPayload = { nexo_id: payload.nexo_id };
        if (titleId) tokenPayload.title_id = titleId;
        if (target)  tokenPayload.target   = target;

        const gameToken = fastify.jwt.sign(tokenPayload, { expiresIn: '1h' });
        return reply.type('text/plain').send(gameToken);
    });

    // POST /api/v1/session/start/:title_id
    // online_initiator.cpp → StartOnlineSession()
    // Registra que el usuario empezó a jugar este juego
    fastify.post('/api/v1/session/start/:title_id', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const bearer = (req.headers['authorization'] || '').replace('Bearer ', '');
        if (!bearer) return reply.code(401).send('');

        let payload;
        try { payload = fastify.jwt.verify(bearer); } catch { return reply.code(401).send(''); }

        const { title_id } = req.params;
        const db = require('../../db');

        // Actualizar presencia: mostrar el juego que está jugando
        await db.query(
            `UPDATE presence p
             JOIN users u ON u.id = p.user_id
             SET p.status = 'in_game', p.game_id = ?, p.last_seen = NOW()
             WHERE u.nexo_id = ?`,
            [title_id, payload.nexo_id]
        ).catch(() => {});

        return reply.send({ result: 'Success' });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  STUBS dauth / aauth
    //  Nintendo Switch llama a estos endpoints ANTES de conectar al online.
    //  SMM2 llama a dauth para obtener un device_auth_token y luego a aauth
    //  para un application_auth_token. Sin estos, el juego no puede iniciar
    //  la sesión online y devuelve error.
    //
    //  El emulador redirige:
    //    dauth-lp1.ndas.srv.nintendo.net → accounts-api-lp1.nexonetwork.space
    //    aauth-lp1.ndas.srv.nintendo.net → accounts-api-lp1.nexonetwork.space
    // ══════════════════════════════════════════════════════════════════════════

    // POST /v6/device_auth_token  — dauth stub
    fastify.post('/v6/device_auth_token', async (req, reply) => {
        // El juego espera un JSON con device_auth_token (string) y expire_in (número)
        const fakeToken = fastify.jwt.sign({ type: 'device_auth' }, { expiresIn: '1h' });
        return reply.send({
            device_auth_token: fakeToken,
            expire_in: 3600,
        });
    });

    // POST /v3/application_auth_token  — aauth stub
    fastify.post('/v3/application_auth_token', async (req, reply) => {
        const fakeToken = fastify.jwt.sign({ type: 'app_auth' }, { expiresIn: '1h' });
        return reply.send({
            application_auth_token: fakeToken,
            expire_in: 3600,
        });
    });

    // POST /api/v1/auth/device_token  — alias por si el emulador usa esta ruta
    fastify.post('/api/v1/auth/device_token', async (req, reply) => {
        const fakeToken = fastify.jwt.sign({ type: 'device_auth' }, { expiresIn: '1h' });
        return reply.send({ result: 'Success', device_auth_token: fakeToken, expire_in: 3600 });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  STUBS accounts.nintendo.com
    //  SMM2 y otros juegos llaman a accounts.nintendo.com para intercambiar
    //  el device_auth_token por un user access_token antes de conectarse a NPLN.
    //  Sin este stub, la autenticación de usuario falla ANTES de llegar a NPLN.
    //
    //  El emulador redirige:
    //    accounts.nintendo.com → accounts-api-lp1.nexonetwork.space
    // ══════════════════════════════════════════════════════════════════════════

    // POST /connect/1.0.0/api/token  — Nintendo account token exchange
    // El juego manda: grant_type, device_auth_token, client_id, etc.
    // Respondemos con un access_token falso que el juego acepta.
    fastify.post('/connect/1.0.0/api/token', async (req, reply) => {
        const fakeToken = fastify.jwt.sign({ type: 'nintendo_user', scope: 'openid user' }, { expiresIn: '1h' });
        return reply.send({
            access_token:  fakeToken,
            token_type:    'Bearer',
            expires_in:    3600,
            scope:         'openid user',
            id_token:      fakeToken,
        });
    });

    // GET /2.0.0/users/:userId  — Perfil de usuario Nintendo
    // El juego pide el perfil después de obtener el access_token.
    fastify.get('/2.0.0/users/:userId', async (req, reply) => {
        return reply.send({
            id:          req.params.userId,
            nickname:    'NexoUser',
            country:     'US',
            birthday:    '1990-01-01',
        });
    });

    // POST /2.0.0/users/:userId/link  — vínculo de cuenta (algunas versiones)
    fastify.post('/2.0.0/users/:userId/link', async (req, reply) => {
        return reply.send({ result: 'Success' });
    });

    // GET /1.0.0/users/:userId/qrcode_param  — parámetro para QR de login
    fastify.get('/1.0.0/users/:userId/qrcode_param', async (req, reply) => {
        return reply.send({ url: '' });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  STUB BAAS (Bad At Authentication Service)
    //  El juego llama a *.baas.nintendo.com DESPUÉS de dauth/aauth para obtener
    //  el token de usuario que necesita para conectarse a NPLN.
    //  Sin este stub, la cadena de auth se rompe antes de llegar a NPLN.
    //
    //  El emulador redirige:
    //    *.baas.nintendo.com → accounts-api-lp1.nexonetwork.space
    //    (gracias al wildcard añadido en config-api.js y al fix en RewriteUrl)
    // ══════════════════════════════════════════════════════════════════════════

    // POST /v1/Login  — Login BAAS principal
    // El juego manda: application_auth_token, device_auth_token, client_id, etc.
    // Respondemos con tokens falsos que hacen que la chain de auth continue.
    fastify.post('/v1/Login', async (req, reply) => {
        const userId = `nexo_${Date.now().toString(16)}`;
        const idToken = fastify.jwt.sign(
            { type: 'baas_user', user_id: userId, 'nintendo_account_id': userId },
            { expiresIn: '1h' }
        );
        return reply.send({
            user: {
                id:                    userId,
                etag:                  '"1"',
                links:                 { nintendoAccount: { membership: { active: true } } },
                memberships:           [],
                analyticsOptedIn:      false,
                isChildRestricted:     false,
                country:               'US',
            },
            idToken,
            accessToken:           idToken,
            expiresIn:             3600,
            fileServerToken:       fastify.jwt.sign({ type: 'file_server' }, { expiresIn: '1h' }),
        });
    });

    // PUT /v1/devices/link  — Vinculación de dispositivo con BAAS
    fastify.put('/v1/devices/link', async (req, reply) => {
        return reply.code(200).send({});
    });

    // PATCH /v1/users/:userId  — Actualización de perfil BAAS
    fastify.patch('/v1/users/:userId', async (req, reply) => {
        return reply.send({ id: req.params.userId });
    });

    // GET /v1/users/:userId  — Obtener perfil BAAS
    fastify.get('/v1/users/:userId', async (req, reply) => {
        return reply.send({
            id:      req.params.userId,
            etag:    '"1"',
            country: 'US',
            links:   { nintendoAccount: { membership: { active: true } } },
        });
    });

    // POST /api/v1/session/end
    // online_initiator.cpp → EndOnlineSession()
    fastify.post('/api/v1/session/end', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const bearer = (req.headers['authorization'] || '').replace('Bearer ', '');
        if (!bearer) return reply.code(401).send('');

        let payload;
        try { payload = fastify.jwt.verify(bearer); } catch { return reply.code(401).send(''); }

        const db = require('../../db');
        await db.query(
            `UPDATE presence p
             JOIN users u ON u.id = p.user_id
             SET p.status = 'online', p.game_id = NULL, p.last_seen = NOW()
             WHERE u.nexo_id = ?`,
            [payload.nexo_id]
        ).catch(() => {});

        return reply.send({ result: 'Success' });
    });

    // GET /api/v1/client/subscription
    // online_initiator.cpp → LoadSubscriptionInfo()
    //
    // IMPORTANTE: El struct C++ OnlineSubscriptionInfo tiene display_subscription como
    // std::string. Si mandamos un booleano false, nlohmann::json lanza type_error y la
    // info nunca se carga. Todos los campos de texto DEBEN ser strings, no booleans.
    //
    // Planes de suscripción:
    //   "Free"  — plan gratuito (por defecto para todos los usuarios)
    //   "Pro"   — reservado para planes de pago futuros
    fastify.get('/api/v1/client/subscription', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const bearer = (req.headers['authorization'] || '').replace('Bearer ', '');
        if (!bearer) return reply.code(401).send({ error: 'Unauthorized' });

        let payload;
        try {
            payload = fastify.jwt.verify(bearer);
        } catch {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Obtener el plan del usuario desde la base de datos.
        // Si no tiene plan asignado → Free por defecto.
        const db = require('../../db');
        let plan = 'Free';
        try {
            const [rows] = await db.query(
                'SELECT subscription_plan FROM users WHERE nexo_id = ?',
                [payload.nexo_id]
            );
            if (rows.length && rows[0].subscription_plan) {
                plan = rows[0].subscription_plan;
            }
        } catch {
            // Si la columna no existe aún en la DB, usamos Free como fallback.
            plan = 'Free';
        }

        // Todos los campos de texto deben ser strings (no booleans) porque el
        // emulador usa nlohmann::json::get<std::string>() en from_json().
        return reply.send({
            display_subscription:             plan,        // "Free", "Pro", etc.
            display_action:                   '',          // texto del botón de acción (vacío = sin botón)
            url_action:                       '',          // URL del botón de acción
            enable_set_username:              true,        // bool - puede cambiar su nombre
            enable_set_profile:               true,        // bool - puede editar su perfil
            show_subscription_upgrade_notice: false,       // bool - no mostrar aviso de upgrade
        });
    });
}

module.exports = accountsApiRoutes;
