'use strict';

/**
 * nintendo/stubs.js
 *
 * Stubs para servicios de Nintendo Switch que necesitan respuesta básica
 * pero no requieren lógica compleja. Todos estos servicios se activan cuando
 * la Switch (con Atmosphere) redirige sus dominios a nuestro servidor vía hosts.
 *
 * Servicios cubiertos:
 *   receive-lp1.er.srv.nintendo.net    → Error reporting (aceptar y descartar)
 *   atum.hac.lp1.d4c.nintendo.net      → System update (responder "sin actualizaciones")
 *   sun.hac.lp1.d4c.nintendo.net       → Update metadata (vacío)
 *   aqua.hac.lp1.d4c.nintendo.net      → Update content (vacío)
 *   tagaya.hac.lp1.eshop.nintendo.net  → Title version list (vacío)
 *   shogun-lp1.eshop.nintendo.net      → eShop API básico
 *   beach.hac.lp1.eshop.nintendo.net   → eShop login
 *   api.sect.srv.nintendo.net          → Sector API
 *   nifm.lp1.srv.nintendo.net          → NIFM server
 *   *.lp1.s.n.srv.nintendo.net         → NEX genérico (juegos sin módulo propio)
 */

// Solo activamos estos stubs cuando el subdominio resuelto es 'nintendo-stubs'
function isNintendoStubSubdomain(req) {
    return req.subdomain === 'nintendo-stubs';
}

async function nintendoStubs(fastify) {

    // ══════════════════════════════════════════════════════════════════════════
    //  ERROR REPORTING — receive-lp1.er.srv.nintendo.net
    //  La Switch envía informes de error/crash periódicamente.
    //  Simplemente aceptamos y descartamos todo.
    // ══════════════════════════════════════════════════════════════════════════

    // POST /v3/reports — Error report principal (firmwares 11+)
    fastify.post('/v3/reports', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.code(204).send();
    });

    // POST /v3/nssys/reports — Error de sistema (firmware < 11)
    fastify.post('/v3/nssys/reports', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.code(204).send();
    });

    // POST /v1/nssys/reports — Error de sistema (versiones antiguas)
    fastify.post('/v1/nssys/reports', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.code(204).send();
    });

    // GET /v3/settings — Configuración del error reporter
    fastify.get('/v3/settings', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({
            send_report: false,
            auto_send:   false,
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  SYSTEM UPDATE — atum.hac.lp1.d4c.nintendo.net
    //  La Switch comprueba si hay actualizaciones del sistema.
    //  Respondemos que no hay actualizaciones disponibles.
    //  Esto evita que la Switch te fuerce a actualizar el firmware.
    // ══════════════════════════════════════════════════════════════════════════

    // GET /v1/system_update_meta — Lista de actualizaciones disponibles
    // La Switch manda: ?device_id=...&firmware_version=...&platform=HAC
    fastify.get('/v1/system_update_meta', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        // Lista vacía = no hay actualizaciones disponibles
        return reply.send({ system_update_metas: [] });
    });

    // GET /v1/latest_system_update_meta — Versión más reciente del sistema
    fastify.get('/v1/latest_system_update_meta', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({ system_update_metas: [] });
    });

    // ── sun.hac.lp1.d4c.nintendo.net — Update metadata ───────────────────────
    // Devuelve metadatos de contenido de actualización (vacío = sin update)

    // GET /v1/system_update_metas/<id>  — Detalles de un update específico
    fastify.get('/v1/system_update_metas/:update_id', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.code(404).send({ error: 'not_found' });
    });

    // GET /v1/contents/<id> — Contenido de un update (aqua)
    fastify.get('/v1/contents/:content_id', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.code(404).send({ error: 'not_found' });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  TITLE VERSION LIST — tagaya.hac.lp1.eshop.nintendo.net
    //  La Switch pide las versiones actuales de los juegos instalados
    //  para saber si hay actualizaciones de juegos pendientes.
    //  Respondemos con una lista vacía para no forzar updates de juegos.
    // ══════════════════════════════════════════════════════════════════════════

    // GET /v1/title_version_list — versiones de todos los títulos
    fastify.get('/v1/title_version_list', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({ title_updates: [] });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  eSHOP API BÁSICO — shogun-lp1.eshop.nintendo.net
    //  Solo implementamos los endpoints que la Switch llama al arrancar.
    //  No implementamos la tienda completa, solo lo necesario para no crashear.
    // ══════════════════════════════════════════════════════════════════════════

    // GET /api/v1/price — Precio de un juego (no lo usamos, stub vacío)
    fastify.get('/api/v1/price', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({ prices: [] });
    });

    // GET /api/v1/applications/:id — Info de una app (stub básico)
    fastify.get('/api/v1/applications/:id', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({ id: req.params.id });
    });

    // POST /api/v1/wishlist — Lista de deseados (ignorar)
    fastify.post('/api/v1/wishlist', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.code(204).send();
    });

    // ── beach.hac.lp1.eshop.nintendo.net — eShop login ───────────────────────
    // Algunos juegos con DLC verifican si el usuario tiene acceso al eShop.
    // Respondemos con un token falso para que la verificación pase.

    // POST /v1/login — Login en el eShop (stub)
    fastify.post('/v1/login', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        const fakeToken = fastify.jwt.sign({ type: 'eshop_session' }, { expiresIn: '1h' });
        return reply.send({
            access_token: fakeToken,
            expires_in:   3600,
        });
    });

    // GET /v1/users/:id — Perfil de usuario del eShop
    fastify.get('/v1/users/:id', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({
            id:      req.params.id,
            country: 'US',
        });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  SECTOR API — api.sect.srv.nintendo.net
    //  Servicio interno de Nintendo para clasificación de regiones y sectores.
    //  Stub básico que devuelve US como región.
    // ══════════════════════════════════════════════════════════════════════════

    // GET /v1/regions — Lista de regiones
    fastify.get('/v1/regions', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({ regions: [{ id: 'americas', name: 'Americas' }] });
    });

    // GET /v1/country/:code — Info de un país
    fastify.get('/v1/country/:code', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({ country: req.params.code, region: 'americas' });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  NEX GENÉRICO — *.lp1.s.n.srv.nintendo.net
    //  Juegos que usan NEX (protocolo antiguo) sin módulo específico.
    //  Devolvemos una respuesta de "servidor no disponible" en lugar de timeout.
    //  Esto evita que el juego se quede colgado esperando conexión.
    // ══════════════════════════════════════════════════════════════════════════

    // Catch-all para rutas de NEX genérico
    // (Los juegos específicos tienen su propio módulo, ej: smm2/routes.js)
    fastify.get('/v1/matchmakings', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        return reply.send({ matchmakings: [] });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  NIFM — nifm.lp1.srv.nintendo.net
    //  Network Interface Management Framework — comprueba conectividad.
    // ══════════════════════════════════════════════════════════════════════════

    // GET /v1/auth_token — Token de autenticación NIFM
    fastify.get('/v1/auth_token', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        const token = fastify.jwt.sign({ type: 'nifm' }, { expiresIn: '1h' });
        return reply.send({ token, expires_in: 3600 });
    });

    // POST /v1/auth_token — Alternativa POST del mismo endpoint
    fastify.post('/v1/auth_token', async (req, reply) => {
        if (!isNintendoStubSubdomain(req)) return reply.code(404).send();
        const token = fastify.jwt.sign({ type: 'nifm' }, { expiresIn: '1h' });
        return reply.send({ token, expires_in: 3600 });
    });

    // ══════════════════════════════════════════════════════════════════════════
    //  CATCH-ALL para nintendo-stubs
    //  Cualquier ruta desconocida de dominios Nintendo que no tenga handler
    //  específico devuelve 200 OK vacío en lugar de 404 o timeout.
    //  Esto evita que la Switch o los juegos se queden colgados.
    // ══════════════════════════════════════════════════════════════════════════

    // Este hook se ejecuta ANTES del not-found handler global
    fastify.addHook('onRequest', async (req, reply) => {
        // No hacemos nada aquí; el not-found handler de server.js maneja el resto.
        // Este módulo solo define rutas específicas.
    });
}

module.exports = nintendoStubs;
