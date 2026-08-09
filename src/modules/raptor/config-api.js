'use strict';

/**
 * config-lp1.nexonetwork.space
 *
 * El emulador (online_initiator.cpp → AskServer()) llama a:
 *   GET /api/v1/rewrites  → mapa de URLs Nintendo → NeXo (CRÍTICO para online)
 *   GET /api/v1/titles    → lista de juegos con online activo
 *   GET /api/v1/config    → configuración general
 *
 * Los rewrites le dicen al emulador a qué servidor conectar cuando el juego
 * intenta conectar a los servidores de Nintendo. Sin esto, el juego no puede
 * jugar online porque el emulador bloquea las conexiones a nintendo.com.
 */

const db = require('../../db');

// Dominio base del servidor NeXo
const BASE = process.env.BASE_DOMAIN || 'nexonetwork.space';

// Host/IP para los servidores de juego NEX (PRUDP sobre UDP). El UDP NO pasa por
// Cloudflare, así que aquí conviene poner la IP pública DIRECTA del servidor
// (ej. NEXO_NEX_HOST=86.127.246.201) para que el juego conecte al origen y no al
// proxy. Si no se define, cae al subdominio mk8-lp1 (que solo sirve si el DNS de
// ese subdominio apunta directo al origen, en gris).
const NEX_HOST = process.env.NEXO_NEX_HOST || `mk8-lp1.${BASE}`;

// ── Tabla de rewrites ─────────────────────────────────────────────────────────
// Mapea hostnames de Nintendo → hostnames de NeXo.
// El emulador llama a ResolveUrl(dns) que busca aquí antes de conectar.
//
// Super Mario Maker 2 (0100000000100000) usa estos servidores de Nintendo:
//   - api.lp1.npln.srv.nintendo.net      → NEX/Rendez-Vous principal
//   - g9s300c4msl.lp1.s.n.srv.nintendo.net → DataStore de SMM2
//   - bcat-list-lp1.cdn.nintendo.net     → BCAT (noticias del juego)
//   - bcat-dl-lp1.cdn.nintendo.net       → Descarga de BCAT
//   - atum.hac.lp1.d4c.nintendo.net      → Sistema de actualización

function buildRewrites() {
    return [
        // ── Auth chain ────────────────────────────────────────────────────────
        {
            source:      'dauth-lp1.ndas.srv.nintendo.net',
            destination: `accounts-api-lp1.${BASE}`,
        },
        {
            source:      'aauth-lp1.ndas.srv.nintendo.net',
            destination: `accounts-api-lp1.${BASE}`,
        },
        {
            source:      'accounts.nintendo.com',
            destination: `accounts-api-lp1.${BASE}`,
        },
        {
            source:      'api.accounts.nintendo.com',
            destination: `accounts-api-lp1.${BASE}`,
        },
        // ── BAAS (wildcard) ───────────────────────────────────────────────────
        // El emulador soporta búsqueda por sufijo desde el fix de RewriteUrl.
        {
            source:      '*.baas.nintendo.com',
            destination: `accounts-api-lp1.${BASE}`,
        },
        // ── Lista de amigos ───────────────────────────────────────────────────
        {
            source:      'friends.lp1.s.n.srv.nintendo.net',
            destination: `switch-friends-lp1.${BASE}`,
        },
        {
            source:      'friends-lp1.s.n.srv.nintendo.net',
            destination: `switch-friends-lp1.${BASE}`,
        },
        // ── Super Mario Maker 2 — DataStore ───────────────────────────────────
        {
            source:      'g9s300c4msl.lp1.s.n.srv.nintendo.net',
            destination: `smm2-lp1.${BASE}`,
        },
        {
            source:      'api.lp1.npln.srv.nintendo.net',
            destination: `smm2-lp1.${BASE}`,
        },
        // ── Mario Kart 8 Deluxe — NEX matchmaking (UDP → IP directa) ─────────
        // Apuntan a NEX_HOST (IP pública directa) para que el UDP llegue al origen
        // sin pasar por Cloudflare.
        {
            source:      'g7sfc1xhmc8.lp1.s.n.srv.nintendo.net',
            destination: NEX_HOST,
        },
        // Servidor NEX real de MK8D visto en el log del emulador (con el % dinámico).
        // Sin esta regla, el emulador cae al fallback → no llega al servidor NEX.
        {
            source:      'g2b309e01-%.s.n.srv.nintendo.net',
            destination: NEX_HOST,
        },
        // Catch-all: cualquier otro servidor de juego *.s.n.srv.nintendo.net sin
        // regla exacta. Los de amigos/SMM2 tienen entrada exacta y tienen prioridad
        // (el emulador busca coincidencia exacta antes que el comodín).
        {
            source:      '*.s.n.srv.nintendo.net',
            destination: NEX_HOST,
        },
        {
            source:      'api-lp1.np.community.srv.nintendo.net',
            destination: `mk8-lp1.${BASE}`,
        },
        // ── BCAT ──────────────────────────────────────────────────────────────
        {
            source:      'bcat-list-lp1.cdn.nintendo.net',
            destination: `bcat-lp1.${BASE}`,
        },
        {
            source:      'bcat-dl-lp1.cdn.nintendo.net',
            destination: `bcat-lp1.${BASE}`,
        },
        // ── Captive portal / conectividad ─────────────────────────────────────
        {
            source:      'ctest.cdn.nintendo.net',
            destination: `connector-lp1.${BASE}`,
        },
        {
            source:      'nasc.nintendowifi.net',
            destination: `connector-lp1.${BASE}`,
        },
        // ── Servicios de sistema (stubs) ──────────────────────────────────────
        // Error reporting — aceptamos y descartamos
        {
            source:      'receive-lp1.er.srv.nintendo.net',
            destination: `status-lp1.${BASE}`,
        },
        // System updates — respondemos "sin actualizaciones"
        {
            source:      'atum.hac.lp1.d4c.nintendo.net',
            destination: `status-lp1.${BASE}`,
        },
        {
            source:      'sun.hac.lp1.d4c.nintendo.net',
            destination: `status-lp1.${BASE}`,
        },
        // Title version list — evita que el emulador pida updates de juegos
        {
            source:      'tagaya.hac.lp1.eshop.nintendo.net',
            destination: `status-lp1.${BASE}`,
        },
    ];
}

async function configApiRoutes(fastify) {

    // ── GET /api/v1/rewrites ──────────────────────────────────────────────────
    // CRÍTICO: online_initiator.cpp → AskServer()
    // Sin este endpoint, el emulador no sabe a dónde redirigir las conexiones
    // del juego y las bloquea (devuelve 127.0.0.1).
    fastify.get('/api/v1/rewrites', async (req, reply) => {
        if (req.subdomain !== 'config-lp1' && req.subdomain !== 'www' && req.subdomain !== '') {
            return reply.code(404).send({ error: 'not found' });
        }

        return reply.send(buildRewrites());
    });

    // ── GET /api/v1/titles ────────────────────────────────────────────────────
    // Lista de juegos con online en NeXo. La consume el emulador
    // (online_initiator.cpp → AskServer) para pintar la columna "NeXo Online".
    //
    // Formato de cada entrada:  { title_id, name, compatibility }
    //   compatibility: 'online' → totalmente jugable  |  'wip' → en progreso/parcial
    //
    // IMPORTANTE: title_id debe ser el REAL del juego (el mismo program_id que ve
    // el emulador), en MAYÚSCULAS, para que la columna haga match.
    fastify.get('/api/v1/titles', async (req, reply) => {
        if (req.subdomain !== 'config-lp1' && req.subdomain !== 'www' && req.subdomain !== '') {
            return reply.code(404).send({ error: 'not found' });
        }

        let rows = [];
        try {
            const [r] = await db.query('SELECT title_id, name, compatibility FROM titles LIMIT 500');
            rows = r;
        } catch {
            rows = [];
        }

        // Juegos con servidor NEX propio en NeXo. Se garantizan SIEMPRE (con su
        // title_id real), aunque la tabla `titles` esté vacía o desactualizada.
        // Al añadir un módulo de juego nuevo en src/modules/games, añádelo aquí.
        const KNOWN_SUPPORTED = [
            { title_id: '0100152000022000', name: 'Mario Kart 8 Deluxe', compatibility: 'online' },
            { title_id: '01009B90006DC000', name: 'Super Mario Maker 2', compatibility: 'online' },
        ];

        // Fusiona DB + conocidos, normalizando a mayúsculas y deduplicando por id.
        // Los KNOWN_SUPPORTED tienen prioridad (id/nombre/estado correctos).
        const byId = new Map();
        for (const t of rows) {
            if (!t.title_id) continue;
            byId.set(t.title_id.toUpperCase(), {
                title_id:      t.title_id.toUpperCase(),
                name:          t.name,
                compatibility: t.compatibility || 'online',
            });
        }
        for (const g of KNOWN_SUPPORTED) {
            byId.set(g.title_id.toUpperCase(), g);
        }

        return reply.send({ result: 'Success', titles: [...byId.values()] });
    });

    fastify.get('/api/v1/config', async (req, reply) => {
        return reply.send({
            result:            'Success',
            telemetry_enabled: false,
            update_check:      false,
            motd:              process.env.MOTD || 'Welcome to NeXoNetwork.',
        });
    });
}

module.exports = configApiRoutes;
