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
        // ── BCAT (noticias/eventos en el juego) ──────────────────────────────
        {
            source:      'bcat-list-lp1.cdn.nintendo.net',
            destination: `bcat-lp1.${BASE}`,
        },
        {
            source:      'bcat-dl-lp1.cdn.nintendo.net',
            destination: `bcat-lp1.${BASE}`,
        },
        // ── Super Mario Maker 2 — DataStore ──────────────────────────────────
        // El juego sube/descarga niveles a través del DataStore de Nintendo.
        // Lo redirigimos al módulo SMM2 de NeXo.
        {
            source:      'g9s300c4msl.lp1.s.n.srv.nintendo.net',
            destination: `smm2-lp1.${BASE}`,
        },
        {
            source:      'api.lp1.npln.srv.nintendo.net',
            destination: `smm2-lp1.${BASE}`,
        },
        // ── Servicios de cuenta Nintendo ─────────────────────────────────────
        // El juego pide un token de cuenta antes de conectar online.
        {
            source:      'accounts.nintendo.com',
            destination: `accounts-api-lp1.${BASE}`,
        },
        {
            source:      'dauth-lp1.ndas.srv.nintendo.net',
            destination: `accounts-api-lp1.${BASE}`,
        },
        {
            source:      'aauth-lp1.ndas.srv.nintendo.net',
            destination: `accounts-api-lp1.${BASE}`,
        },
        // ── BAAS (autenticación de usuario para NPLN) ─────────────────────────
        // Después de dauth/aauth, el juego llama a un subdominio BAAS único por
        // título para obtener el token de usuario de NPLN.
        // Usamos wildcard "*.baas.nintendo.com" para capturar cualquier subdominio.
        // El emulador soporta este patrón desde el fix de RewriteUrl en
        // online_initiator.cpp (búsqueda por sufijo).
        {
            source:      '*.baas.nintendo.com',
            destination: `accounts-api-lp1.${BASE}`,
        },
        // ── Lista de amigos Switch ────────────────────────────────────────────
        {
            source:      'friends.lp1.s.n.srv.nintendo.net',
            destination: `switch-friends-lp1.${BASE}`,
        },
        {
            source:      'friends-lp1.s.n.srv.nintendo.net',
            destination: `switch-friends-lp1.${BASE}`,
        },
        // ── Conectores de red ─────────────────────────────────────────────────
        {
            source:      'ctest.cdn.nintendo.net',
            destination: `connector-lp1.${BASE}`,
        },
        {
            source:      'nasc.nintendowifi.net',
            destination: `connector-lp1.${BASE}`,
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
    // Lista de juegos con online activo. Incluye SMM2 aunque no esté en la DB.
    fastify.get('/api/v1/titles', async (req, reply) => {
        if (req.subdomain !== 'config-lp1' && req.subdomain !== 'www' && req.subdomain !== '') {
            return reply.code(404).send({ error: 'not found' });
        }

        let titles = [];
        try {
            const [rows] = await db.query('SELECT title_id, name, compatibility FROM titles LIMIT 500');
            titles = rows;
        } catch {
            titles = [];
        }

        // Asegurar que SMM2 siempre aparece aunque no esté en la DB
        const smm2Id = '0100000000100000';
        if (!titles.find(t => t.title_id?.toLowerCase() === smm2Id)) {
            titles.push({
                title_id:      smm2Id,
                name:          'Super Mario Maker 2',
                compatibility: 'online',
            });
        }

        return reply.send({ result: 'Success', titles });
    });

    // ── GET /api/v1/config ────────────────────────────────────────────────────
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
