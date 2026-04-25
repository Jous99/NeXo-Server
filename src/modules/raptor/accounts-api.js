'use strict';

const crypto = require('crypto');

// Genera un ID estable de 16 chars a partir de cualquier string (device_id, IP, etc.)
// SHA-256 → primeros 16 chars en hex → siempre el mismo resultado para el mismo input
function stableId(input) {
    return crypto.createHash('sha256').update(String(input)).digest('hex').slice(0, 16);
}

// ── Almacén en memoria para auth codes (flujo OAuth Switch HOME) ──────────────
// Código de un solo uso con TTL 5 min. Clave: code aleatorio, valor: datos del usuario.
const authCodes = new Map(); // code → { nexo_id, challenge, redirect_uri, expires_at }
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of authCodes) {
        if (v.expires_at < now) authCodes.delete(k);
    }
}, 60_000);

// ── Almacén en memoria para flujo login del emulador (register/redirect) ──────
// El emulador abre el navegador con la URL de login y sondea el token.
// TTL: 10 minutos. Clave: polling_token (hex aleatorio de 32 bytes)
// Valor: { raptor_token: string|null, expires_at: number, hardware_id: string }
const redirectSessions = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of redirectSessions) {
        if (v.expires_at < now) redirectSessions.delete(k);
    }
}, 60_000);

// Escapa caracteres especiales HTML para evitar XSS en la página de login
function encodeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Página HTML de login/registro ─────────────────────────────────────────────
// Diseño idéntico a la web principal: fondo #0a0e1a, azul #00a8e8, grid lines.
// La Switch la muestra en su navegador WebKit al vincular una cuenta desde el menú HOME.
// Usa CSS puro, sin JS complejo, para máxima compatibilidad con el browser de Switch.
function buildLoginPage({ redirect_uri = '', state = '', client_id = '', challenge = '', tab = 'login', error = '', form_action = '' } = {}) {
    const action  = form_action || '/connect/1.0.0/authorize';
    const qBase = `redirect_uri=${encodeURIComponent(redirect_uri)}&state=${encodeURIComponent(state)}&client_id=${encodeURIComponent(client_id)}&session_token_code_challenge=${encodeURIComponent(challenge)}`;
    const isReg  = tab === 'register';
    const errHtml = error
        ? `<div class="err">⚠ ${encodeHtml(error)}</div>`
        : '';

    const hiddenFields = `
        <input type="hidden" name="redirect_uri"                    value="${encodeHtml(redirect_uri)}">
        <input type="hidden" name="state"                           value="${encodeHtml(state)}">
        <input type="hidden" name="client_id"                       value="${encodeHtml(client_id)}">
        <input type="hidden" name="session_token_code_challenge"    value="${encodeHtml(challenge)}">`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>NeXoNetwork — Cuenta</title>
  <style>
    :root{--bg:#0a0e1a;--bg2:#0f1525;--card:#131b2e;--border:#1e2d4a;
          --accent:#00a8e8;--red:#e4003a;--text:#e8eaf0;--muted:#8892a4}
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Segoe UI',system-ui,-apple-system,sans-serif;
      background:var(--bg);color:var(--text);
      min-height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:16px;
      background-image:
        radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,168,232,.1) 0%,transparent 70%),
        linear-gradient(rgba(0,168,232,.03) 1px,transparent 1px),
        linear-gradient(90deg,rgba(0,168,232,.03) 1px,transparent 1px);
      background-size:auto,60px 60px,60px 60px;
    }
    .logo-wrap{display:flex;align-items:center;gap:10px;margin-bottom:24px}
    .logo-icon{
      width:40px;height:40px;border-radius:10px;
      background:linear-gradient(135deg,var(--accent),var(--red));
      display:flex;align-items:center;justify-content:center;
      font-size:1.2rem;font-weight:900;color:#fff;
      box-shadow:0 0 16px rgba(0,168,232,.4);
    }
    .logo-text .name{font-size:1.3rem;font-weight:800;letter-spacing:.3px}
    .logo-text .name .n{color:var(--accent)}.logo-text .name .x{color:var(--red)}
    .logo-text .sub{font-size:.72rem;color:var(--muted);margin-top:1px}
    .card{
      background:var(--card);border:1px solid var(--border);
      border-radius:16px;padding:28px 24px;width:100%;max-width:390px;
      box-shadow:0 8px 40px rgba(0,0,0,.4);
    }
    .tabs{display:flex;background:var(--bg);border-radius:10px;padding:4px;margin-bottom:22px;gap:4px}
    .tab{
      flex:1;padding:9px;text-align:center;border-radius:7px;font-size:.85rem;
      font-weight:600;text-decoration:none;color:var(--muted);display:block;
    }
    .tab.on{background:linear-gradient(90deg,var(--accent),#0077b6);color:#fff;
            box-shadow:0 2px 12px rgba(0,168,232,.3)}
    label{
      display:block;font-size:.72rem;color:var(--muted);margin-bottom:5px;margin-top:16px;
      font-weight:600;letter-spacing:.4px;text-transform:uppercase;
    }
    input[type=text],input[type=password],input[type=email]{
      width:100%;padding:11px 14px;background:var(--bg2);
      border:1px solid var(--border);border-radius:9px;
      color:var(--text);font-size:1rem;outline:none;
      transition:border-color .2s,box-shadow .2s;
    }
    input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,168,232,.12)}
    .btn{
      display:block;width:100%;padding:13px;margin-top:22px;
      background:linear-gradient(90deg,var(--accent),#0077b6);
      border:none;border-radius:10px;color:#fff;font-size:1rem;
      font-weight:700;cursor:pointer;letter-spacing:.2px;
      box-shadow:0 4px 20px rgba(0,168,232,.3);-webkit-appearance:none;
    }
    .btn:active{filter:brightness(.88)}
    .err{
      background:rgba(228,0,58,.1);border:1px solid rgba(228,0,58,.35);
      border-radius:9px;padding:10px 13px;font-size:.85rem;
      color:#ff6b8a;margin-bottom:16px;
    }
    .footer{margin-top:18px;font-size:.72rem;color:var(--muted);text-align:center}
  </style>
</head>
<body>
  <div class="logo-wrap">
    <div class="logo-icon">N</div>
    <div class="logo-text">
      <div class="name"><span class="n">Ne</span><span class="x">Xo</span>Network</div>
      <div class="sub">Open Switch Online</div>
    </div>
  </div>
  <div class="card">
    ${errHtml}
    <div class="tabs">
      <a class="tab${!isReg ? ' on' : ''}" href="${action}?tab=login&${qBase}">Iniciar sesión</a>
      <a class="tab${isReg  ? ' on' : ''}" href="${action}?tab=register&${qBase}">Crear cuenta</a>
    </div>
    ${isReg ? `
    <form method="POST" action="${action}">
      ${hiddenFields}
      <input type="hidden" name="action" value="register">
      <label>Usuario</label>
      <input type="text" name="username" autocomplete="username" required placeholder="mi_usuario">
      <label>Email</label>
      <input type="email" name="email" autocomplete="email" required placeholder="correo@ejemplo.com">
      <label>Contraseña</label>
      <input type="password" name="password" autocomplete="new-password" required placeholder="mínimo 6 caracteres">
      <label>Nombre visible <span style="font-weight:400;text-transform:none">(opcional)</span></label>
      <input type="text" name="display_name" placeholder="Ej: JoseSwitch">
      <button type="submit" class="btn">Crear cuenta →</button>
    </form>` : `
    <form method="POST" action="${action}">
      ${hiddenFields}
      <input type="hidden" name="action" value="login">
      <label>Usuario</label>
      <input type="text" name="username" autocomplete="username" required placeholder="mi_usuario">
      <label>Contraseña</label>
      <input type="password" name="password" autocomplete="current-password" required placeholder="contraseña">
      <button type="submit" class="btn">Entrar →</button>
    </form>`}
    <div class="footer">NeXoNetwork · Open Source · Sin ánimo de lucro</div>
  </div>
</body>
</html>`;
}

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

            // El token que devolvemos aquí es el raptor_token del emulador.
            // El emulador lo guarda en la config y no hace refresh automático,
            // así que usamos una duración larga (30 días, igual que los refresh tokens).
            const access_token = fastify.jwt.sign(
                { nexo_id: result.nexo_id, nickname: result.nickname },
                { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' }
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
    // La Switch manda su device_id en el body (form-encoded o JSON).
    // Lo extraemos para generar un fingerprint estable por dispositivo.
    fastify.post('/v6/device_auth_token', async (req, reply) => {
        // Intentar extraer device_id del body (puede venir como JSON o form-encoded)
        const body = req.body || {};
        const deviceId = body.device_id || body.deviceId || req.ip || 'unknown';
        const deviceFingerprint = stableId(deviceId);

        const fakeToken = fastify.jwt.sign(
            { type: 'device_auth', device_fingerprint: deviceFingerprint },
            { expiresIn: '1h' }
        );
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

    // ══════════════════════════════════════════════════════════════════════════
    //  FLUJO OAUTH2 — VINCULACIÓN DE CUENTA DESDE EL MENÚ HOME DE LA SWITCH
    //
    //  Cuando el usuario va a Settings → Users → Link Nintendo Account, la Switch
    //  abre su navegador WebKit en:
    //    https://accounts.nintendo.com/connect/1.0.0/authorize?response_type=session_token_code&...
    //
    //  Como tenemos accounts.nintendo.com redirigido a nuestro servidor (via Atmosphere
    //  hosts file), esa petición llega aquí. Servimos nuestra propia página de login.
    //
    //  Flujo completo:
    //    1. Switch → GET  /connect/1.0.0/authorize      → HTML login page
    //    2. User   → POST /connect/1.0.0/authorize      → login/register → redirect npifr://
    //    3. Switch → POST /connect/1.0.0/api/session_token  → session_token
    //    4. Switch → POST /connect/1.0.0/api/token          → access_token con nexo_id real
    //    5. Switch → GET  /2.0.0/users/me                   → perfil del usuario
    //    ¡Cuenta vinculada! La Switch muestra el nombre de NeXo en el perfil.
    // ══════════════════════════════════════════════════════════════════════════

    // GET /connect/1.0.0/authorize  — Sirve la página de login al navegador de la Switch
    fastify.get('/connect/1.0.0/authorize', async (req, reply) => {
        const q = req.query || {};
        const html = buildLoginPage({
            redirect_uri: q.redirect_uri   || '',
            state:        q.state          || '',
            client_id:    q.client_id      || '',
            challenge:    q.session_token_code_challenge || '',
            tab:          q.tab            || 'login',
            error:        '',
        });
        return reply.type('text/html').send(html);
    });

    // POST /connect/1.0.0/authorize  — Procesa el formulario de login/registro
    fastify.post('/connect/1.0.0/authorize', async (req, reply) => {
        const body = req.body || {};
        const {
            action       = 'login',
            username     = '',
            password     = '',
            email        = '',
            display_name = '',
            redirect_uri = '',
            state        = '',
            client_id    = '',
            session_token_code_challenge: challenge = '',
        } = body;

        const pageParams = { redirect_uri, state, client_id, challenge };

        let userResult;
        try {
            if (action === 'register') {
                if (!username || !email || !password) {
                    const html = buildLoginPage({ ...pageParams, tab: 'register', error: 'Faltan campos obligatorios.' });
                    return reply.type('text/html').send(html);
                }
                userResult = await accounts.register({ username, email, password, nickname: display_name || username });
            } else {
                if (!username || !password) {
                    const html = buildLoginPage({ ...pageParams, tab: 'login', error: 'Introduce usuario y contraseña.' });
                    return reply.type('text/html').send(html);
                }
                userResult = await accounts.login({ login: username, password, deviceInfo: 'SwitchBrowser', ip: req.ip });
            }
        } catch (err) {
            const tab = action === 'register' ? 'register' : 'login';
            const html = buildLoginPage({ ...pageParams, tab, error: err.message || 'Error de autenticación.' });
            return reply.type('text/html').send(html);
        }

        // Generar un código de un solo uso (session_token_code)
        const code = crypto.randomBytes(32).toString('base64url');
        authCodes.set(code, {
            nexo_id:      userResult.nexo_id,
            challenge,
            redirect_uri,
            expires_at:   Date.now() + 5 * 60 * 1000,  // TTL: 5 minutos
        });

        // Redirigir a la Switch con el código (la Switch detecta el esquema npifr://)
        // La URL puede ser: npifr://auth?session_token_code=CODE&state=STATE
        let callbackUrl;
        try {
            callbackUrl = new URL(redirect_uri);
        } catch {
            // Fallback por si el redirect_uri no es una URL válida para Node
            callbackUrl = { toString: () => redirect_uri };
            const sep = redirect_uri.includes('?') ? '&' : '?';
            const extra = `session_token_code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
            return reply.redirect(302, `${redirect_uri}${sep}${extra}`);
        }
        callbackUrl.searchParams.set('session_token_code', code);
        if (state) callbackUrl.searchParams.set('state', state);
        return reply.redirect(302, callbackUrl.toString());
    });

    // POST /connect/1.0.0/api/session_token  — Intercambia el código por un session_token
    // La Switch llama a este endpoint después de recibir el session_token_code en el redirect.
    fastify.post('/connect/1.0.0/api/session_token', async (req, reply) => {
        const body = req.body || {};
        const code     = body.session_token_code;
        const verifier = body.session_token_code_verifier; // PKCE verifier (S256)

        const codeData = authCodes.get(code);
        if (!codeData || codeData.expires_at < Date.now()) {
            return reply.code(400).send({ error: 'invalid_grant', error_description: 'Code expired or invalid.' });
        }

        // Verificación PKCE opcional: SHA-256(verifier) debería coincidir con el challenge
        if (codeData.challenge && verifier) {
            const computed = crypto.createHash('sha256').update(verifier).digest('base64url');
            if (computed !== codeData.challenge) {
                return reply.code(400).send({ error: 'invalid_grant', error_description: 'PKCE verification failed.' });
            }
        }

        // El código se consume (un solo uso)
        authCodes.delete(code);

        // El session_token es un JWT de larga duración (30 días) con el nexo_id del usuario
        const sessionToken = fastify.jwt.sign(
            { type: 'session_token', nexo_id: codeData.nexo_id },
            { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' }
        );

        return reply.send({
            code:          'session_token_code',
            session_token: sessionToken,
        });
    });

    // GET /2.0.0/agreements  — Stub TOS (la Switch puede pedirlo antes del authorize)
    fastify.get('/2.0.0/agreements', async (req, reply) => {
        return reply.send({ agreements: [] });
    });

    // POST /2.0.0/agreements  — Aceptar TOS (stub, siempre OK)
    fastify.post('/2.0.0/agreements', async (req, reply) => {
        return reply.code(204).send();
    });

    // POST /connect/1.0.0/api/token  — Nintendo account token exchange
    // Modos:
    //  a) grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer + session_token
    //     → devuelve access_token con el nexo_id real del usuario
    //  b) grant_type=device_auth_token (juego sin login de usuario)
    //     → devuelve access_token genérico (como antes)
    fastify.post('/connect/1.0.0/api/token', async (req, reply) => {
        const body = req.body || {};
        const sessionToken = body.session_token;

        let nexo_id  = null;
        let nickname = 'NexoUser';

        // Si viene un session_token real (del flujo authorize), extraemos el nexo_id
        if (sessionToken) {
            try {
                const decoded = fastify.jwt.verify(sessionToken);
                if (decoded.type === 'session_token' && decoded.nexo_id) {
                    nexo_id = decoded.nexo_id;
                    // Buscar el nickname en la DB
                    try {
                        const db = require('../../db');
                        const [rows] = await db.query(
                            'SELECT username, nickname FROM users WHERE nexo_id = ?',
                            [nexo_id]
                        );
                        if (rows.length) {
                            nickname = rows[0].nickname || rows[0].username || nickname;
                        }
                    } catch { /* DB no disponible, usamos 'NexoUser' */ }
                }
            } catch { /* session_token inválido — generamos token anónimo */ }
        }

        const accessToken = fastify.jwt.sign(
            { type: 'nintendo_user', nexo_id, nickname, scope: 'openid user' },
            { expiresIn: '1h' }
        );

        return reply.send({
            access_token:  accessToken,
            token_type:    'Bearer',
            expires_in:    3600,
            scope:         'openid user',
            id_token:      accessToken,
        });
    });

    // GET /2.0.0/users/me  — Perfil del usuario actual (via Bearer token)
    // La Switch llama a este endpoint justo después del token exchange para mostrar el nombre.
    fastify.get('/2.0.0/users/me', async (req, reply) => {
        const bearer = (req.headers['authorization'] || '').replace('Bearer ', '');
        let nexo_id = null, nickname = 'NexoUser', country = 'US';

        if (bearer) {
            try {
                const decoded = fastify.jwt.verify(bearer);
                nexo_id  = decoded.nexo_id  || null;
                nickname = decoded.nickname || 'NexoUser';
            } catch {}
        }

        // Buscar datos reales en la DB si tenemos nexo_id
        if (nexo_id) {
            try {
                const db = require('../../db');
                const [rows] = await db.query(
                    'SELECT username, nickname, country FROM users WHERE nexo_id = ?',
                    [nexo_id]
                );
                if (rows.length) {
                    nickname = rows[0].nickname || rows[0].username || nickname;
                    country  = rows[0].country  || 'US';
                }
            } catch {}
        }

        return reply.send({
            id:       nexo_id || 'nexo_guest',
            nickname,
            country,
            birthday: '1990-01-01',
            links:    { nintendoAccount: { membership: { active: true } } },
        });
    });

    // GET /2.0.0/users/:userId  — Perfil de usuario por ID
    // El juego pide el perfil después de obtener el access_token.
    fastify.get('/2.0.0/users/:userId', async (req, reply) => {
        const userId = req.params.userId;

        // Si el userId es "me", redirigimos al handler de arriba
        if (userId === 'me') {
            const bearer = (req.headers['authorization'] || '').replace('Bearer ', '');
            let nexo_id = null, nickname = 'NexoUser';
            if (bearer) {
                try { const d = fastify.jwt.verify(bearer); nexo_id = d.nexo_id; nickname = d.nickname || 'NexoUser'; } catch {}
            }
            return reply.send({ id: nexo_id || userId, nickname, country: 'US', birthday: '1990-01-01' });
        }

        // Intentar buscar en la DB
        let nickname = 'NexoUser', country = 'US';
        try {
            const db = require('../../db');
            const [rows] = await db.query(
                'SELECT username, nickname, country FROM users WHERE nexo_id = ?',
                [userId]
            );
            if (rows.length) {
                nickname = rows[0].nickname || rows[0].username || nickname;
                country  = rows[0].country  || 'US';
            }
        } catch {}

        return reply.send({
            id:       userId,
            nickname,
            country,
            birthday: '1990-01-01',
            links:    { nintendoAccount: { membership: { active: true } } },
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
    // El juego manda: application_auth_token, device_auth_token, id_token, client_id, etc.
    //
    // Prioridad para determinar el userId:
    //   1. id_token real (viene del flujo OAuth authorize si el usuario vinculó su cuenta
    //      desde el menú HOME) → usa el nexo_id real de la DB → ¡amigos funcionan!
    //   2. device_auth_token con device_fingerprint (generado por nosotros en /v6/device_auth_token)
    //   3. Hash de la IP como último fallback
    fastify.post('/v1/Login', async (req, reply) => {
        const body = req.body || {};

        let nexo_id           = null;
        let deviceFingerprint = null;

        // ── 1. Intentar id_token real (flujo OAuth completo) ──────────────────
        // Si el usuario vinculó su cuenta desde el menú HOME, el juego incluirá un
        // id_token que contiene el nexo_id real. Esto da el mejor resultado.
        const idToken = body.id_token || body.idToken;
        if (idToken) {
            try {
                const decoded = fastify.jwt.verify(idToken);
                if (decoded.nexo_id) {
                    nexo_id = decoded.nexo_id;
                }
            } catch { /* id_token expirado o no nuestro */ }
        }

        // ── 2. Fallback: device_auth_token con fingerprint ────────────────────
        if (!nexo_id) {
            const rawDeviceToken = body.device_auth_token || body.deviceAuthToken;
            if (rawDeviceToken) {
                try {
                    const decoded = fastify.jwt.verify(rawDeviceToken);
                    deviceFingerprint = decoded.device_fingerprint || null;
                } catch { /* Token expirado o no nuestro */ }
            }
        }

        // ── 3. Último fallback: hash de IP ─────────────────────────────────────
        if (!nexo_id && !deviceFingerprint) {
            deviceFingerprint = stableId(req.ip || 'unknown');
        }

        const userId = nexo_id || `nx_${deviceFingerprint}`;

        // Buscar nickname real si tenemos un nexo_id de un usuario registrado
        let nickname = 'NexoUser';
        if (nexo_id) {
            try {
                const db = require('../../db');
                const [rows] = await db.query(
                    'SELECT username, nickname FROM users WHERE nexo_id = ?',
                    [nexo_id]
                );
                if (rows.length) {
                    nickname = rows[0].nickname || rows[0].username || nickname;
                }
            } catch {}
        }

        const baasToken = fastify.jwt.sign(
            { type: 'baas_user', user_id: userId, nintendo_account_id: userId, nickname },
            { expiresIn: '1h' }
        );

        return reply.send({
            user: {
                id:                userId,
                etag:              '"1"',
                nickname,
                links:             { nintendoAccount: { membership: { active: true } } },
                memberships:       [],
                analyticsOptedIn:  false,
                isChildRestricted: false,
                country:           'US',
            },
            idToken:         baasToken,
            accessToken:     baasToken,
            expiresIn:       3600,
            fileServerToken: fastify.jwt.sign({ type: 'file_server' }, { expiresIn: '1h' }),
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

    // ══════════════════════════════════════════════════════════════════════════
    //  FLUJO DE LOGIN DESDE EL BOTÓN DEL EMULADOR (register/redirect)
    //
    //  Cuando el usuario hace clic en "Click Here to Login" en la barra del
    //  emulador, monitor.cpp ejecuta este flujo:
    //
    //    1. POST /api/v1/client/register/redirect
    //       ← { url, token }
    //       El emulador abre `url` en el navegador del sistema.
    //
    //    2. El usuario inicia sesión en la página web (GET/POST /emu-login?token=TOKEN)
    //
    //    3. GET /api/v1/client/register/redirect/token (Header R-Token: TOKEN)
    //       ← 204 mientras el usuario aún no completó el login
    //       ← 200 + body (plain text) = JWT del usuario cuando ya completó
    //       ← 4xx si el token expiró o es inválido
    //
    //  La sesión expira a los 10 minutos si no se completa.
    // ══════════════════════════════════════════════════════════════════════════

    // POST /api/v1/client/register/redirect
    // monitor.cpp → WorkerLoop() — se llama cuando el usuario pulsa el botón de login
    fastify.post('/api/v1/client/register/redirect', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const hardwareId = req.headers['r-hardwareid'] || req.headers['r-hardware-id'] || 'unknown';
        const clientId   = req.headers['r-clientid']   || req.headers['r-client-id']   || 'nexoemu';

        // Generar un token de sondeo único y de un solo uso
        const pollingToken = crypto.randomBytes(32).toString('hex');

        redirectSessions.set(pollingToken, {
            raptor_token: null,          // null = aún sin completar
            hardware_id:  hardwareId,
            client_id:    clientId,
            expires_at:   Date.now() + 10 * 60 * 1000, // TTL: 10 minutos
        });

        const BASE = process.env.BASE_DOMAIN || 'nexonetwork.space';
        const loginUrl = `https://${BASE}/emu-login?token=${pollingToken}`;

        return reply.send({
            url:   loginUrl,
            token: pollingToken,
        });
    });

    // GET /api/v1/client/register/redirect/token
    // monitor.cpp → WorkerLoop() — sondea periódicamente hasta que el usuario complete el login
    fastify.get('/api/v1/client/register/redirect/token', async (req, reply) => {
        if (!isAccountsSubdomain(req)) return reply.code(404).send({ error: 'not found' });

        const pollingToken = req.headers['r-token'] || '';
        if (!pollingToken) return reply.code(400).send('');

        const session = redirectSessions.get(pollingToken);
        if (!session) return reply.code(410).send(''); // 410 Gone: expiró o no existe

        if (session.expires_at < Date.now()) {
            redirectSessions.delete(pollingToken);
            return reply.code(410).send('');
        }

        if (!session.raptor_token) {
            // Aún esperando que el usuario complete el login
            return reply.code(204).send();
        }

        // Login completado — devolver el JWT al emulador (texto plano, como esperan en Settings)
        const raptorToken = session.raptor_token;
        redirectSessions.delete(pollingToken); // un solo uso
        return reply.type('text/plain').send(raptorToken);
    });

    // GET /emu-login   — Página de login para el flujo del emulador
    // El navegador del sistema abre esta URL. El usuario inicia sesión aquí.
    fastify.get('/emu-login', async (req, reply) => {
        const token = req.query?.token || '';
        const session = redirectSessions.get(token);

        if (!session || session.expires_at < Date.now()) {
            return reply.type('text/html').send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>NeXoNetwork</title>
<style>body{font-family:system-ui;background:#0a0e1a;color:#e8eaf0;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}</style>
</head><body><div style="text-align:center">
<h2 style="color:#e4003a">Enlace expirado</h2>
<p>Este enlace de login ha expirado o ya fue usado.<br>Haz clic en el botón del emulador para generar uno nuevo.</p>
</div></body></html>`);
        }

        const html = buildLoginPage({
            redirect_uri: `/emu-login?token=${encodeURIComponent(token)}`,
            form_action:  '/emu-login',
        });
        return reply.type('text/html').send(html);
    });

    // POST /emu-login  — Procesa el formulario de login del flujo del emulador
    fastify.post('/emu-login', async (req, reply) => {
        const body = req.body || {};
        const {
            action       = 'login',
            username     = '',
            password     = '',
            email        = '',
            display_name = '',
            redirect_uri = '',
        } = body;

        // Extraer el token de la query de redirect_uri
        const tokenMatch = redirect_uri.match(/[?&]token=([^&]+)/);
        const pollingToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : '';
        const session = pollingToken ? redirectSessions.get(pollingToken) : null;

        const errorPage = (err, tab = 'login') => {
            const html = buildLoginPage({
                redirect_uri,
                form_action: '/emu-login',
                error: err,
                tab,
            });
            return reply.type('text/html').send(html);
        };

        if (!session || session.expires_at < Date.now()) {
            return errorPage('Sesión expirada. Vuelve a hacer clic en el emulador.');
        }

        let userResult;
        try {
            if (action === 'register') {
                if (!username || !email || !password) {
                    return errorPage('Faltan campos obligatorios.');
                }
                userResult = await accounts.register({
                    username, email, password, nickname: display_name || username,
                });
            } else {
                if (!username || !password) {
                    return errorPage('Introduce usuario y contraseña.');
                }
                userResult = await accounts.login({
                    login: username, password, deviceInfo: 'EmuBrowser', ip: req.ip,
                });
            }
        } catch (err) {
            const errTab = action === 'register' ? 'register' : 'login';
            return errorPage(err.message || 'Error de autenticación.', errTab);
        }

        // Generar el JWT que el emulador guardará como raptor_token.
        // Debe ser de larga duración: el emulador lo guarda en la config y no hace
        // refresh automático. Usamos el mismo TTL que los refresh tokens (30 días).
        const raptorJwt = fastify.jwt.sign(
            { nexo_id: userResult.nexo_id, nickname: userResult.nickname },
            { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' }
        );

        // Marcar la sesión como completada con el token
        session.raptor_token = raptorJwt;

        return reply.type('text/html').send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>NeXoNetwork — Login completado</title>
<style>
:root{--bg:#0a0e1a;--accent:#00a8e8;--text:#e8eaf0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);
     display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px;
     background-image:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(0,168,232,.1) 0%,transparent 70%)}
.card{background:#131b2e;border:1px solid #1e2d4a;border-radius:16px;padding:32px 24px;
      text-align:center;max-width:340px;box-shadow:0 8px 40px rgba(0,0,0,.4)}
.icon{font-size:3rem;margin-bottom:16px}
h2{font-size:1.2rem;margin-bottom:8px;color:var(--accent)}
p{color:#8892a4;font-size:.9rem;line-height:1.5}
.name{color:var(--text);font-weight:700}
</style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h2>¡Login completado!</h2>
    <p>Bienvenido, <span class="name">${userResult.nickname || username}</span>.<br><br>
       Puedes cerrar esta ventana.<br>El emulador se conectará automáticamente.</p>
  </div>
</body>
</html>`);
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
