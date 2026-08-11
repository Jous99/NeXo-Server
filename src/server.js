'use strict';

require('dotenv').config();

// ── Red de seguridad global ───────────────────────────────────────────────────
// Evita que un error asíncrono suelto (una promesa rechazada sin catch, una
// excepción no capturada en algún handler, la BD caída, etc.) tumbe TODO el
// proceso y con él la web. Registramos el error y seguimos sirviendo.
process.on('unhandledRejection', (reason) => {
    console.error('⚠️  unhandledRejection (la web sigue en pie):', reason);
});
process.on('uncaughtException', (err) => {
    console.error('⚠️  uncaughtException (la web sigue en pie):', err);
});

// ── Registro a fichero (logs/server.log) ──────────────────────────────────────
// Guardamos TODA la salida de consola en un fichero para poder mostrarla en el
// panel admin SIN depender de PM2 (aaPanel/Docker no siempre exponen el CLI pm2).
// Funciona sea cual sea la forma de arrancar el servidor.
(() => {
    const fsLog   = require('fs');
    const pathLog = require('path');
    const dir     = pathLog.join(__dirname, '..', 'logs');
    const file    = pathLog.join(dir, 'server.log');
    try {
        fsLog.mkdirSync(dir, { recursive: true });
        // Rotación simple: si el log supera 5 MB, lo movemos a .1 y empezamos limpio.
        if (fsLog.existsSync(file) && fsLog.statSync(file).size > 5 * 1024 * 1024) {
            try { fsLog.renameSync(file, file + '.1'); } catch { /* ignorar */ }
        }
        // Abrimos el fichero en modo 'append' y escribimos de forma SÍNCRONA en
        // cada línea. Así el fichero existe al instante y cada log queda en disco
        // aunque el proceso muera de golpe (más fiable que un stream con buffer).
        const fd = fsLog.openSync(file, 'a');
        for (const ch of ['stdout', 'stderr']) {
            const orig = process[ch].write.bind(process[ch]);
            process[ch].write = (chunk, enc, cb) => {
                try { fsLog.writeSync(fd, typeof chunk === 'string' ? chunk : chunk.toString()); }
                catch { /* nunca romper la consola */ }
                return orig(chunk, enc, cb);
            };
        }
        console.log(`🗒️  Logs del servidor → ${file}`);
    } catch (e) {
        console.error('No se pudo iniciar el log a fichero:', e.message);
    }
})();

const fs       = require('fs');
const path     = require('path');
const Fastify    = require('fastify');
const fjwt       = require('@fastify/jwt');
const fcors      = require('@fastify/cors');
const sensible   = require('@fastify/sensible');
const fwebsocket   = require('@fastify/websocket');
const fmultipart   = require('@fastify/multipart');

const errorHandler     = require('./plugins/errorHandler');
const { authenticate } = require('./middleware/auth');

// ── Módulo Accounts ───────────────────────────────────────────────────────────
const authRoutes    = require('./modules/accounts/routes/auth');
const profileRoutes = require('./modules/accounts/routes/profile');
const friendsRoutes = require('./modules/accounts/routes/friends');
const adminRoutes   = require('./modules/accounts/routes/admin');

// ── Módulos por subdominio (protocolo RaptorCitrus) ───────────────────────────
const accountsApiRoutes  = require('./modules/raptor/accounts-api');
const profileApiRoutes   = require('./modules/raptor/profile-api');
const friendsApiRoutes   = require('./modules/raptor/friends-api');
const configApiRoutes    = require('./modules/raptor/config-api');
const statusApiRoutes    = require('./modules/raptor/status-api');
const notifApiRoutes     = require('./modules/raptor/notification-api');
const connectorRoutes    = require('./modules/raptor/connector-api');
const bcastRoutes        = require('./modules/raptor/bcat-api');
const switchFriendsApi   = require('./modules/raptor/switch-friends-api');
const chatApiRoutes      = require('./modules/raptor/chat-api');

// ── Contenido web (ajustes del sitio, roadmap, blog) ──────────────────────────
const contentRoutes      = require('./modules/content/routes');

// ── Sistema ───────────────────────────────────────────────────────────────────
const systemRoutes = require('./routes/system');

// ── Juegos ────────────────────────────────────────────────────────────────────
const smm2Routes    = require('./modules/games/smm2/routes');
const smm2NexTcp    = require('./modules/games/smm2/nex_tcp');
const mk8Routes     = require('./modules/games/mk8/routes');
const mk8NexTcp     = require('./modules/games/mk8/nex_tcp');
const mk8Bridge     = require('./modules/games/mk8/nex_bridge');

// ── NEX WebSocket unificado ───────────────────────────────────────────────────
// Ambos juegos (MK8 y SMM2) usan las mismas rutas WS (/nex, /ws),
// así que se registran una sola vez y se despacha por subdominio.
const nexWsRoutes   = require('./modules/games/nex_ws');

// ── Stubs de servicios Nintendo (Switch real) ─────────────────────────────────
const nintendoStubs = require('./modules/nintendo/stubs');

// ── Web (HTML embebido) ───────────────────────────────────────────────────────
const webHtml    = require('./web/app');
const emuHtml    = fs.readFileSync(path.join(__dirname, 'web/nexo-emu.html'), 'utf8');
const manageHtml  = fs.readFileSync(path.join(__dirname, 'web/admin-panel.html'), 'utf8');
const roadmapHtml = fs.readFileSync(path.join(__dirname, 'web/roadmap.html'), 'utf8');
const blogHtml    = fs.readFileSync(path.join(__dirname, 'web/blog.html'), 'utf8');

// ─── Mapa de subdominios → manejador ─────────────────────────────────────────
// Tu dominio base configurado en .env (ej: "nexonetwork.space")
// El servidor distingue el subdominio por el header Host de cada petición.
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'nexonetwork.space';

// ── Mapa de dominios Nintendo reales → módulo interno ────────────────────────
// Cuando la Switch moddeada se conecta vía Atmosphere hosts, el header Host
// llega con el dominio real de Nintendo (ej: "dauth-lp1.ndas.srv.nintendo.net")
// en lugar de nuestro subdominio. Esta tabla hace el mapeo.
const NINTENDO_HOST_MAP = {
    // ── Auth chain ──────────────────────────────────────────────────────────
    'dauth-lp1.ndas.srv.nintendo.net':              'accounts-api-lp1',
    'aauth-lp1.ndas.srv.nintendo.net':              'accounts-api-lp1',
    'accounts.nintendo.com':                         'accounts-api-lp1',
    'api.accounts.nintendo.com':                     'accounts-api-lp1',

    // ── Lista de amigos ──────────────────────────────────────────────────────
    'friends.lp1.s.n.srv.nintendo.net':             'switch-friends-lp1',
    'friends-lp1.s.n.srv.nintendo.net':             'switch-friends-lp1',

    // ── Juego: Super Mario Maker 2 ───────────────────────────────────────────
    'g9s300c4msl.lp1.s.n.srv.nintendo.net':         'smm2-lp1',
    'api.lp1.npln.srv.nintendo.net':                'smm2-lp1',

    // ── Juego: Mario Kart 8 Deluxe ──────────────────────────────────────────
    'g7sfc1xhmc8.lp1.s.n.srv.nintendo.net':         'mk8-lp1',
    'api-lp1.np.community.srv.nintendo.net':         'mk8-lp1',

    // ── BCAT ────────────────────────────────────────────────────────────────
    'bcat-list-lp1.cdn.nintendo.net':               'bcat-lp1',
    'bcat-dl-lp1.cdn.nintendo.net':                 'bcat-lp1',

    // ── Captive portal / conectividad ────────────────────────────────────────
    'ctest.cdn.nintendo.net':                        'connector-lp1',
    'nasc.nintendowifi.net':                         'connector-lp1',
    'conntest.romstation.fr':                        'connector-lp1',  // algunos CFW

    // ── Servicios de sistema Nintendo (nuevos stubs) ──────────────────────────
    'receive-lp1.er.srv.nintendo.net':              'nintendo-stubs', // error reporting
    'receive-lp1.dg.srv.nintendo.net':              'nintendo-stubs', // diagnosis
    'atum.hac.lp1.d4c.nintendo.net':                'nintendo-stubs', // system update
    'sun.hac.lp1.d4c.nintendo.net':                 'nintendo-stubs', // update metadata
    'aqua.hac.lp1.d4c.nintendo.net':                'nintendo-stubs', // update content
    'tagaya.hac.lp1.eshop.nintendo.net':            'nintendo-stubs', // title versions
    'shogun-lp1.eshop.nintendo.net':                'nintendo-stubs', // eShop API
    'beach.hac.lp1.eshop.nintendo.net':             'nintendo-stubs', // eShop login
    'pushmo.hac.lp1.er.nintendo.net':               'nintendo-stubs', // push errors
    'api.sect.srv.nintendo.net':                     'nintendo-stubs', // sector API
    'nifm.lp1.srv.nintendo.net':                    'nintendo-stubs', // NIFM
};

// Resuelve el subdominio interno a partir del header Host.
// Soporta dominios NeXo, dominios Nintendo reales (Switch con Atmosphere),
// y el wildcard *.baas.nintendo.com.
function resolveSubdomain(host) {
    // 1. Lookup directo en la tabla Nintendo
    if (NINTENDO_HOST_MAP[host]) return NINTENDO_HOST_MAP[host];

    // 2. Wildcard BAAS: e97b8a9d672e4ce4845b-sb.baas.nintendo.com
    if (host.endsWith('.baas.nintendo.com')) return 'accounts-api-lp1';

    // 3. Wildcard NEX por juego: *.lp1.s.n.srv.nintendo.net (genérico)
    if (host.endsWith('.lp1.s.n.srv.nintendo.net')) return 'nintendo-stubs';

    // 4. Subdominios NeXo normales
    const sub = host.replace(`.${BASE_DOMAIN}`, '').replace(BASE_DOMAIN, '');
    return sub || 'www';
}

// ─────────────────────────────────────────────────────────────────────────────

async function buildApp() {
    // ── HTTPS opcional (para Switch real con certificados propios) ────────────
    // Activa con: NEXO_HTTPS=true en .env
    // Genera los certs con: ./scripts/gen-certs.sh
    let httpsConfig = undefined;
    if (process.env.NEXO_HTTPS === 'true') {
        const certsDir = path.join(__dirname, '..', 'certs');
        try {
            httpsConfig = {
                key:  fs.readFileSync(path.join(certsDir, 'server.key')),
                cert: fs.readFileSync(path.join(certsDir, 'server.crt')),
            };
            console.log('🔒 HTTPS activado con certificados propios');
        } catch (e) {
            console.warn('⚠️  NEXO_HTTPS=true pero no se encontraron los certs en /certs/');
            console.warn('   Ejecuta: ./scripts/gen-certs.sh');
        }
    }

    const fastify = Fastify({
        logger:     { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
        trustProxy: true,
        ...(httpsConfig ? { https: httpsConfig } : {}),
    });

    // ── CORS ──────────────────────────────────────────────────────────────────
    await fastify.register(fcors, {
        origin:         true,
        credentials:    true,
        methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    await fastify.register(sensible);
    // Multipart — para subida de archivos (avatar de perfil)
    await fastify.register(fmultipart, { limits: { fileSize: 3 * 1024 * 1024 } });
    // WebSocket — necesario para notification-api.js (el emulador conecta via wss://)
    await fastify.register(fwebsocket);
    await fastify.register(fjwt, {
        secret: process.env.JWT_SECRET || 'nexo_dev_secret_CHANGE_IN_PRODUCTION',
    });

    fastify.decorate('authenticate', authenticate);
    fastify.setErrorHandler(errorHandler);

    // ── Health check (responde en cualquier subdominio) ───────────────────────
    fastify.get('/health', async () => ({
        ok: true, service: 'nexo-server',
        version: require('../package.json').version,
        ts: Date.now(),
    }));

    // ── Estado del servidor NEX (Go / mk8-auth) ───────────────────────────────
    // nex es un proceso Go aparte que habla UDP (PRUDP), así que el navegador no
    // puede comprobarlo directo. Aquí miramos si el proceso está vivo escaneando
    // /proc (sin depender de pm2/pgrep) y si el binario ya está compilado.
    fastify.get('/health/nex', async () => {
        const binDir  = path.join(__dirname, '..', 'nex-server');
        const built   = fs.existsSync(path.join(binDir, 'mk8-auth')) ||
                        fs.existsSync(path.join(binDir, 'mk8-auth.exe'));

        // ¿Está corriendo el proceso mk8-auth? (mira el ejecutable, no toda la
        // línea de comando — misma función que usa el arranque automático.)
        const running = nexProcessRunning();

        return {
            ok: true,
            running,
            built,
            port: parseInt(process.env.NEXO_MK8_AUTH_UDP_PORT || '60000'),
        };
    });

    // ── Página del emulador ───────────────────────────────────────────────────
    fastify.get('/emulator', async (req, reply) => {
        return reply.type('text/html').send(emuHtml);
    });

    // ── Panel de administración de contenido (registros, roadmap, blog) ───────
    fastify.get('/manage', async (req, reply) => {
        return reply.type('text/html').send(manageHtml);
    });

    // ── Páginas públicas de roadmap y blog ────────────────────────────────────
    fastify.get('/roadmap', async (req, reply) => {
        return reply.type('text/html').send(roadmapHtml);
    });
    fastify.get('/blog', async (req, reply) => {
        return reply.type('text/html').send(blogHtml);
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  ROUTER POR SUBDOMINIO
    //  El emulador conecta a subdominios diferentes según el servicio.
    //  Fastify recibe todas las peticiones en el mismo puerto (3000).
    //  aaPanel hace de reverse proxy para cada subdominio hacia localhost:3000.
    //  Aquí distinguimos el subdominio por el header Host.
    // ══════════════════════════════════════════════════════════════════════════

    fastify.addHook('onRequest', async (request, reply) => {
        const host = (request.headers.host || '').split(':')[0].toLowerCase();
        request.subdomain = resolveSubdomain(host);
    });

    // ── Web pública (dominio raíz o www) + NIFM captive portal ───────────────
    fastify.get('/', async (req, reply) => {
        const sub = req.subdomain;

        // NIFM captive portal test
        // La Switch hace GET / a ctest.cdn.nintendo.net para verificar internet.
        // Sin 200 OK → error 2038-2306 y el juego no conecta.
        // Aplica tanto al subdominio NeXo como al dominio Nintendo redirigido.
        if (sub === 'connector-lp1' || sub === 'nintendo-stubs') {
            return reply.code(200).type('text/plain').send('ok');
        }

        // Dominio raíz o www → sirve la landing/portal web
        if (!sub || sub === 'www' || sub === BASE_DOMAIN) {
            return reply.type('text/html').send(webHtml);
        }

        // Otros subdominios no tienen ruta raíz
        return reply.code(404).send({ error: 'Not found' });
    });

    // ── Portal web (rutas de la SPA) ──────────────────────────────────────────
    // Todas las rutas no-API del dominio principal devuelven el HTML
    fastify.setNotFoundHandler(async (req, reply) => {
        const sub = req.subdomain;
        const isApiSubdomain = [
            'accounts-api-lp1', 'profile-lp1', 'friends-lp1',
            'config-lp1', 'bcat-lp1', 'notification-lp1',
            'connector-lp1', 'status-lp1', 'citrus-api-lp1',
            'smm2-lp1', 'mk8-lp1', 'switch-friends-lp1', 'chat-lp1',
        ].includes(sub);

        if (!isApiSubdomain && req.method === 'GET') {
            return reply.type('text/html').send(webHtml);
        }
        return reply.code(404).send({ ok: false, error: 'Endpoint not found' });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  RUTAS POR SUBDOMINIO — Protocolo RaptorCitrus
    // ══════════════════════════════════════════════════════════════════════════

    // accounts-api-lp1.nexonetwork.space — Auth y cuentas desde el emulador
    fastify.register(accountsApiRoutes, { prefix: '/' });

    // profile-lp1.nexonetwork.space — Perfiles
    fastify.register(profileApiRoutes, { prefix: '/' });

    // friends-lp1.nexonetwork.space — Amigos
    fastify.register(friendsApiRoutes, { prefix: '/' });

    // config-lp1.nexonetwork.space — Configuración y lista de títulos
    fastify.register(configApiRoutes, { prefix: '/' });

    // status-lp1.nexonetwork.space — Estado del servidor (troubleshooter)
    fastify.register(statusApiRoutes, { prefix: '/' });

    // notification-lp1.nexonetwork.space
    fastify.register(notifApiRoutes, { prefix: '/' });

    // connector-lp1.nexonetwork.space
    fastify.register(connectorRoutes, { prefix: '/' });

    // bcat-lp1.nexonetwork.space — BCAT (background content)
    fastify.register(bcastRoutes, { prefix: '/' });

    // smm2-lp1.nexonetwork.space — Super Mario Maker 2 (HTTP API)
    fastify.register(smm2Routes, { prefix: '/' });

    // mk8-lp1.nexonetwork.space — Mario Kart 8 Deluxe (HTTP API)
    fastify.register(mk8Routes, { prefix: '/' });

    // NEX WebSocket unificado — despacha MK8/SMM2 por subdominio
    // Las rutas /nex y /ws se registran UNA sola vez aquí.
    fastify.register(nexWsRoutes, { prefix: '/' });

    // switch-friends-lp1.nexonetwork.space — Nintendo Switch friends HTTP API
    // La Switch real redirige friends.lp1.s.n.srv.nintendo.net aquí vía DNS.
    fastify.register(switchFriendsApi, { prefix: '/' });

    // chat-lp1.nexonetwork.space — Mensajería de texto entre usuarios del emulador
    fastify.register(chatApiRoutes, { prefix: '/' });

    // Contenido web: /api/content/* (público) y /api/content/admin/* (admin)
    fastify.register(contentRoutes, { prefix: '/' });

    // nintendo-stubs — Servicios Nintendo que la Switch llama pero que solo
    // necesitan respuesta básica (error reporting, actualizaciones, eShop básico).
    fastify.register(nintendoStubs, { prefix: '/' });

    // ══════════════════════════════════════════════════════════════════════════
    //  RUTAS WEB — Portal de usuario (dominio raíz)
    // ══════════════════════════════════════════════════════════════════════════
    fastify.register(authRoutes,    { prefix: '/auth' });
    fastify.register(profileRoutes, { prefix: '/profile' });
    fastify.register(friendsRoutes, { prefix: '/friends' });
    fastify.register(adminRoutes,   { prefix: '/admin' });
    fastify.register(systemRoutes,  { prefix: '/admin/system' });

    return fastify;
}

// ─────────────────────────────────────────────────────────────────────────────
//  NEX (Go) — arranque automático de mk8-auth junto con Node
// ─────────────────────────────────────────────────────────────────────────────
// ¿Hay ya un proceso cuyo EJECUTABLE se llame "mk8-auth"? (mismo criterio que
// /health/nex). Evita lanzar una segunda copia que chocaría en el puerto UDP.
function nexProcessRunning() {
    try {
        for (const pid of fs.readdirSync('/proc')) {
            if (!/^\d+$/.test(pid)) continue;
            try {
                const argv0 = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0')[0] || '';
                const base  = argv0.split('/').pop();
                if (base === 'mk8-auth' || base === 'mk8-auth.exe') return true;
            } catch { /* proceso que desapareció, sin permisos, etc. */ }
        }
    } catch { /* sistema sin /proc (p.ej. Windows en desarrollo) */ }
    return false;
}

// Lanza el servidor NEX Go (mk8-auth) como proceso HIJO de Node, de modo que
// arranca y muere junto con él. Defensivo: solo si el binario está compilado y
// las claves configuradas; no duplica el proceso si ya corre; y nunca tumba la
// web si algo falla.
function startNexServices() {
    const cp     = require('child_process');
    const binDir = path.join(__dirname, '..', 'nex-server');
    const bin    = path.join(binDir, process.platform === 'win32' ? 'mk8-auth.exe' : 'mk8-auth');

    if (!fs.existsSync(bin)) {
        console.log('ℹ️  nex (mk8-auth) no está compilado — se omite el arranque automático.');
        return;
    }
    if (!process.env.NEXO_MK8_ACCESS_KEY || !process.env.NEXO_MK8_SECURE_PASSWORD) {
        console.log('ℹ️  nex: faltan NEXO_MK8_ACCESS_KEY / NEXO_MK8_SECURE_PASSWORD en .env — no se arranca.');
        return;
    }
    if (nexProcessRunning()) {
        console.log('ℹ️  nex (mk8-auth) ya está en marcha — no se lanza otra copia.');
        return;
    }

    try {
        const child = cp.spawn(bin, [], { cwd: binDir, env: process.env });
        child.stdout.on('data', (d) => process.stdout.write('[nex] ' + d));
        child.stderr.on('data', (d) => process.stderr.write('[nex] ' + d));
        child.on('exit',  (code) => console.log(`[nex] mk8-auth terminó (código ${code}).`));
        child.on('error', (e)    => console.error('[nex] no se pudo lanzar mk8-auth:', e.message));

        // Cuando Node se cierra, cerramos también nex para no dejarlo huérfano.
        const kill = () => { try { child.kill(); } catch { /* ya estaba muerto */ } };
        process.on('exit', kill);
        process.on('SIGINT',  () => { kill(); process.exit(0); });
        process.on('SIGTERM', () => { kill(); process.exit(0); });

        console.log('🏁 nex (mk8-auth) arrancado automáticamente junto con Node.');
    } catch (e) {
        console.error('⚠️  Falló el arranque automático de nex (la web sigue en pie):', e.message);
    }
}

async function start() {
    const app  = await buildApp();
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    // ── NEX TCP servers ────────────────────────────────────────────────────────
    // Switch games connect via raw TCP with PRUDP protocol.
    // These are SEPARATE from the HTTP server — they listen on their own ports.
    // The auth ticket inside the game tells it to connect to these ports.
    const mk8TcpPort  = parseInt(process.env.NEXO_MK8_TCP_PORT  || '29900');
    const smm2TcpPort = parseInt(process.env.NEXO_SMM2_TCP_PORT || '29901');

    // The NEX host must be the public IP or domain that the game can reach.
    // For local testing: 127.0.0.1. For production: your server's public IP.
    const nexHost = process.env.NEXO_TCP_HOST || host;

    try {
        // La WEB es el servicio crítico: si no arranca, sí abortamos.
        await app.listen({ port, host });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }

    // ── Servidores NEX TCP (opcionales) ─────────────────────────────────────────
    // Estos son para el multijugador de los juegos. Si alguno falla (puerto
    // ocupado, etc.) NO debe tumbar la web: la envolvemos en su propio try/catch
    // y, además, cada servidor tiene su server.on('error') interno. Resultado:
    // la web sigue en pie aunque los servidores de juego no estén bien.
    try {
        // MK8: puente al NEX real (Go) o stub interno, según NEXO_MK8_BRIDGE.
        // - Puente (recomendado): el emulador (prudps/TLS) → puente → nex-go (WSS),
        //   que hace el NEX de verdad (firmas, Kerberos, matchmaking).
        // - Stub: implementación mínima en Node (sin firmas). Solo para pruebas.
        if (process.env.NEXO_MK8_BRIDGE === 'true') {
            const goHost = process.env.NEXO_MK8_GO_HOST || '127.0.0.1';
            const goPort = parseInt(process.env.NEXO_MK8_GO_WSS_PORT || process.env.NEXO_MK8_AUTH_UDP_PORT || '60000');
            mk8Bridge.startBridge(host, mk8TcpPort, goHost, goPort);
        } else {
            mk8NexTcp.startTcpServer(host, mk8TcpPort, nexHost, mk8TcpPort);
        }
        smm2NexTcp.startTcpServer(host, smm2TcpPort, nexHost, smm2TcpPort, BASE_DOMAIN);
    } catch (err) {
        console.error('⚠️  No se pudieron iniciar los servidores NEX TCP. ' +
            'La web sigue funcionando; el multijugador quedará desactivado.', err.message);
    }

    // ── NEX Go (mk8-auth) — arranca junto con Node ──────────────────────────────
    startNexServices();

    console.log(`\n🎮 NeXoNetwork Server en http://${host}:${port}`);
    console.log(`   Dominio base: ${BASE_DOMAIN}`);
    console.log(`\n   🏁 MK8 NEX TCP:  ${host}:${mk8TcpPort}`);
    console.log(`   🍄 SMM2 NEX TCP: ${host}:${smm2TcpPort}`);
    console.log(`\n   Subdominios que debes configurar en aaPanel:`);
    console.log(`   → ${BASE_DOMAIN}                     (web + portal)`);
    console.log(`   → accounts-api-lp1.${BASE_DOMAIN}   (auth emulador)`);
    console.log(`   → profile-lp1.${BASE_DOMAIN}        (perfiles)`);
    console.log(`   → friends-lp1.${BASE_DOMAIN}        (amigos)`);
    console.log(`   → config-lp1.${BASE_DOMAIN}         (configuración)`);
    console.log(`   → bcat-lp1.${BASE_DOMAIN}           (BCAT)`);
    console.log(`   → notification-lp1.${BASE_DOMAIN}   (notificaciones)`);
    console.log(`   → connector-lp1.${BASE_DOMAIN}      (connector)`);
    console.log(`   → status-lp1.${BASE_DOMAIN}         (estado)`);
    console.log(`   → smm2-lp1.${BASE_DOMAIN}           (Mario Maker 2 + NEX)`);
    console.log(`   → mk8-lp1.${BASE_DOMAIN}            (Mario Kart 8 + NEX)`);
    console.log(`\n   Puertos TCP para NEX (abrir en firewall):`);
    console.log(`   → ${mk8TcpPort}  (MK8 PRUDP)`);
    console.log(`   → ${smm2TcpPort}  (SMM2 PRUDP)\n`);
}

start();
