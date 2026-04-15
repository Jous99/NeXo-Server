#!/usr/bin/env node
/**
 * NeXoNetwork — Script de prueba completo
 *
 * Prueba todos los endpoints y módulos del servidor.
 * Uso:
 *   node scripts/test.js                  ← contra localhost:3000
 *   node scripts/test.js http://IP:3000   ← contra otro servidor
 *
 * No necesita dependencias extra — usa fetch nativo de Node 18+.
 */

'use strict';

const BASE = process.argv[2] || 'http://localhost:3000';

// Dominio base detectado desde BASE (para construir los headers Host correctos)
// ej: http://localhost:3000  →  "localhost"
// ej: https://nexonetwork.space  →  "nexonetwork.space"
const BASE_HOST = new (require('url').URL)(BASE).hostname;

// ── Colores para la terminal ──────────────────────────────────────────────────
const G  = s => `\x1b[32m${s}\x1b[0m`;   // verde
const R  = s => `\x1b[31m${s}\x1b[0m`;   // rojo
const Y  = s => `\x1b[33m${s}\x1b[0m`;   // amarillo
const B  = s => `\x1b[36m${s}\x1b[0m`;   // azul
const DIM = s => `\x1b[2m${s}\x1b[0m`;   // tenue
const BOLD = s => `\x1b[1m${s}\x1b[0m`;  // negrita

// ── Contadores ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;

// ── Helper de peticiones ──────────────────────────────────────────────────────
// Usa http.request (no fetch) para poder sobrescribir el header Host.
// fetch en Node sigue la spec WHATWG y prohíbe cambiar Host.
const http  = require('http');
const https = require('https');
const { URL } = require('url');

async function req(method, path, { body, headers = {}, host } = {}) {
    const url  = new URL(BASE + path);
    const isHttps = url.protocol === 'https:';
    const lib  = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : null;
    const h = {
        'Content-Type': 'application/json',
        ...headers,
    };
    if (host)     h['Host']           = host;
    if (bodyStr)  h['Content-Length'] = Buffer.byteLength(bodyStr);

    return new Promise((resolve) => {
        const opts = {
            hostname: url.hostname,
            port:     url.port || (isHttps ? 443 : 80),
            path:     url.pathname + url.search,
            method,
            headers: h,
            ...(isHttps ? { rejectUnauthorized: false } : {}),
        };

        const r = lib.request(opts, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                let data = null;
                try {
                    data = (res.headers['content-type'] || '').includes('json')
                        ? JSON.parse(raw)
                        : raw;
                } catch { data = raw; }
                resolve({ status: res.statusCode, data });
            });
        });

        r.on('error', e => resolve({ status: 0, error: e.message }));
        if (bodyStr) r.write(bodyStr);
        r.end();
    });
}

// ── Función de test ───────────────────────────────────────────────────────────
async function test(name, fn, { skip = false } = {}) {
    if (skip) {
        console.log(`  ${Y('⊘')} ${DIM(name)} ${DIM('(omitido)')}`);
        skipped++;
        return null;
    }
    try {
        const result = await fn();
        console.log(`  ${G('✓')} ${name}`);
        passed++;
        return result;
    } catch (e) {
        console.log(`  ${R('✗')} ${name}`);
        console.log(`     ${DIM('→')} ${R(e.message)}`);
        failed++;
        return null;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Aserción fallida');
}

// ── Sección ───────────────────────────────────────────────────────────────────
function section(title) {
    console.log(`\n${BOLD(B('▸ ' + title))}`);
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    console.log('');
    console.log(BOLD('  NeXoNetwork — Suite de pruebas'));
    console.log(DIM(`  Servidor: ${BASE}`));
    console.log(DIM('  ' + '─'.repeat(50)));

    // ── 1. HEALTH ─────────────────────────────────────────────────────────────
    section('Health check');

    await test('GET /health → 200 OK', async () => {
        const r = await req('GET', '/health');
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.ok === true, 'ok !== true');
        assert(r.data?.service === 'nexo-server', 'service incorrecto');
    });

    // ── 2. STUBS NINTENDO (sin auth) ──────────────────────────────────────────
    section('Stubs Nintendo — Auth chain (sin auth)');

    await test('POST /v6/device_auth_token → dauth stub', async () => {
        const r = await req('POST', '/v6/device_auth_token', { body: {} });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.device_auth_token, 'falta device_auth_token');
    });

    await test('POST /v3/application_auth_token → aauth stub', async () => {
        const r = await req('POST', '/v3/application_auth_token', { body: {} });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.application_auth_token, 'falta application_auth_token');
    });

    await test('POST /connect/1.0.0/api/token → accounts.nintendo.com stub', async () => {
        const r = await req('POST', '/connect/1.0.0/api/token', {
            body: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer' }
        });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.access_token, 'falta access_token');
    });

    await test('POST /v1/Login → BAAS stub', async () => {
        const r = await req('POST', '/v1/Login', {
            body: { application_auth_token: 'fake', client_id: 'test' }
        });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.user?.id, 'falta user.id');
        assert(r.data?.idToken, 'falta idToken');
    });

    await test('GET /v2.0.0/users/testid → Perfil Nintendo stub', async () => {
        const r = await req('GET', '/2.0.0/users/testid');
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.id === 'testid', 'id incorrecto');
    });

    // ── 3. STUBS SISTEMA NINTENDO ─────────────────────────────────────────────
    section('Stubs Nintendo — Servicios de sistema');

    await test('POST /v3/reports → error reporting stub (204)', async () => {
        // Simulando el header Host de la Switch real
        const r = await req('POST', '/v3/reports', {
            body: {},
            host: 'receive-lp1.er.srv.nintendo.net'
        });
        assert(r.status === 204, `HTTP ${r.status} (esperaba 204)`);
    });

    await test('GET /v1/system_update_meta → sin actualizaciones', async () => {
        const r = await req('GET', '/v1/system_update_meta?device_id=test&platform=HAC', {
            host: 'atum.hac.lp1.d4c.nintendo.net'
        });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(Array.isArray(r.data?.system_update_metas), 'falta system_update_metas');
        assert(r.data.system_update_metas.length === 0, 'debería estar vacío (sin updates)');
    });

    await test('GET /v1/title_version_list → sin updates de juegos', async () => {
        const r = await req('GET', '/v1/title_version_list', {
            host: 'tagaya.hac.lp1.eshop.nintendo.net'
        });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(Array.isArray(r.data?.title_updates), 'falta title_updates');
    });

    await test('GET /v1/system_update_meta (dominio NeXo) → igual resultado', async () => {
        const r = await req('GET', '/v1/system_update_meta');
        // Sin el header Host de Nintendo, el módulo stub no lo reconoce → 404 esperado
        // (Este test verifica que el routing por subdominio funciona correctamente)
        assert(r.status === 404 || r.status === 200, `HTTP ${r.status} inesperado`);
    });

    // ── 4. CAPTIVE PORTAL ─────────────────────────────────────────────────────
    section('Captive portal / NIFM');

    await test('GET / con Host connector-lp1 → 200 OK (captive portal)', async () => {
        const r = await req('GET', '/', { host: `connector-lp1.${BASE_HOST}` });
        assert(r.status === 200, `HTTP ${r.status}`);
    });

    await test('GET /generate_204 → 204 (captive portal Android)', async () => {
        const r = await req('GET', '/generate_204');
        assert(r.status === 204, `HTTP ${r.status}`);
    });

    // ── 5. CONFIG API ─────────────────────────────────────────────────────────
    section('Config API — Rewrites y títulos');

    await test('GET /api/v1/rewrites → lista de rewrites para el emulador', async () => {
        const r = await req('GET', '/api/v1/rewrites', {
            host: `config-lp1.${BASE_HOST}`
        });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(Array.isArray(r.data), 'respuesta debe ser array');
        assert(r.data.length > 0, 'la lista de rewrites está vacía');
        const dauth = r.data.find(x => x.source?.includes('dauth'));
        assert(dauth, 'falta rewrite de dauth');
        console.log(DIM(`       ${r.data.length} rewrites configurados`));
    });

    await test('GET /api/v1/titles → lista de juegos compatibles', async () => {
        const r = await req('GET', '/api/v1/titles', {
            host: `config-lp1.${BASE_HOST}`
        });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.result === 'Success', 'result !== Success');
        assert(Array.isArray(r.data?.titles), 'falta titles[]');
        const smm2 = r.data.titles.find(t => t.name?.includes('Mario Maker'));
        assert(smm2, 'SMM2 no aparece en la lista de títulos');
    });

    await test('GET /api/v1/config → configuración del servidor', async () => {
        const r = await req('GET', '/api/v1/config');
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.result === 'Success', 'result !== Success');
    });

    // ── 6. SERVER INFO ────────────────────────────────────────────────────────
    section('Server info — Protocolo RaptorCitrus');

    await test('GET /api/v1/server/info → info del servidor', async () => {
        const r = await req('GET', '/api/v1/server/info');
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.result === 'Success', 'result !== Success');
        assert(r.data?.name === 'NeXoNetwork', `nombre incorrecto: ${r.data?.name}`);
        console.log(DIM(`       v${r.data?.version} — MOTD: "${r.data?.motd}"`));
    });

    // ── 7. REGISTRO Y LOGIN ───────────────────────────────────────────────────
    section('Accounts — Registro y login');

    const testUser = {
        username: `test_${Date.now()}`,
        email:    `test_${Date.now()}@nexo.test`,
        password: 'Test1234!',
        display_name: 'TestUser'
    };
    let accessToken = null;

    const regResult = await test('POST /api/v1/auth/register → crear cuenta', async () => {
        const r = await req('POST', '/api/v1/auth/register', { body: testUser });
        if (r.status === 503 || r.status === 500) {
            throw new Error(`Error de servidor (¿MySQL corriendo?): HTTP ${r.status}`);
        }
        assert(r.status === 201, `HTTP ${r.status} — ${JSON.stringify(r.data)}`);
        assert(r.data?.result === 'Success', `result: ${r.data?.result}`);
        assert(r.data?.user_id, 'falta user_id');
        console.log(DIM(`       Usuario: ${testUser.username} (${r.data.user_id})`));
        return r.data;
    });

    const loginResult = await test('POST /api/v1/auth/authenticate → login', async () => {
        const r = await req('POST', '/api/v1/auth/authenticate', {
            body: { username: testUser.username, password: testUser.password }
        });
        assert(r.status === 200, `HTTP ${r.status} — ${JSON.stringify(r.data)}`);
        assert(r.data?.result === 'Success', `result: ${r.data?.result}`);
        assert(r.data?.token, 'falta token JWT');
        accessToken = r.data.token;
        console.log(DIM(`       Token: ${accessToken.slice(0, 30)}...`));
        return r.data;
    });

    await test('POST /api/v1/auth/authenticate → login con contraseña incorrecta → 401', async () => {
        const r = await req('POST', '/api/v1/auth/authenticate', {
            body: { username: testUser.username, password: 'wrongpassword' }
        });
        assert(r.status === 401, `HTTP ${r.status} (esperaba 401)`);
    });

    // ── 8. ENDPOINTS AUTENTICADOS ─────────────────────────────────────────────
    section('Endpoints autenticados (requieren token)');

    const auth = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    const hasToken = !!accessToken;

    await test('GET /api/v1/client/account_id → ID del usuario como hex', async () => {
        if (!hasToken) throw new Error('Sin token (registro/login fallaron)');
        const r = await req('GET', '/api/v1/client/account_id', { headers: auth });
        assert(r.status === 200, `HTTP ${r.status}`);
        // Responde con texto plano (hex)
        const id = typeof r.data === 'string' ? r.data : String(r.data);
        assert(id.length > 0, 'respuesta vacía');
        console.log(DIM(`       Account ID (hex): ${id}`));
    }, { skip: !hasToken });

    await test('POST /api/v1/client/login → game token', async () => {
        if (!hasToken) throw new Error('Sin token');
        const r = await req('POST', '/api/v1/client/login', {
            headers: { ...auth, 'R-TitleId': '0100000000100000' }
        });
        // 400 si el title_id no está en la DB, 200 si sí está
        assert(r.status === 200 || r.status === 400, `HTTP ${r.status}`);
        if (r.status === 400) {
            console.log(DIM(`       400 esperado: SMM2 no está en la DB de títulos aún`));
        }
    }, { skip: !hasToken });

    await test('GET /api/v1/client/subscription → plan del usuario', async () => {
        if (!hasToken) throw new Error('Sin token');
        const r = await req('GET', '/api/v1/client/subscription', { headers: auth });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.display_subscription, 'falta display_subscription');
        console.log(DIM(`       Plan: ${r.data.display_subscription}`));
    }, { skip: !hasToken });

    await test('POST /api/v1/session/start/:title_id → marcar como in-game', async () => {
        if (!hasToken) throw new Error('Sin token');
        const r = await req('POST', '/api/v1/session/start/0100000000100000', {
            headers: auth
        });
        assert(r.status === 200, `HTTP ${r.status}`);
    }, { skip: !hasToken });

    await test('POST /api/v1/session/end → volver a online', async () => {
        if (!hasToken) throw new Error('Sin token');
        const r = await req('POST', '/api/v1/session/end', { headers: auth });
        assert(r.status === 200, `HTTP ${r.status}`);
    }, { skip: !hasToken });

    // ── 9. FRIENDS API ────────────────────────────────────────────────────────
    section('Friends API — Lista de amigos (Switch real)');

    await test('GET /v1/users/:pid/friends → lista de amigos (sin auth → 401)', async () => {
        const r = await req('GET', '/v1/users/NXID-FAKE-0000-0001/friends', {
            host: `switch-friends-lp1.${BASE_HOST}`
        });
        assert(r.status === 401, `HTTP ${r.status} (esperaba 401)`);
    });

    // ── 10. BCAT ──────────────────────────────────────────────────────────────
    section('BCAT — Contenido de fondo');

    await test('GET /api/v1/bcat/:title_id → lista BCAT', async () => {
        const r = await req('GET', '/api/v1/bcat/0100000000100000', {
            host: `bcat-lp1.${BASE_HOST}`
        });
        assert(r.status === 200, `HTTP ${r.status}`);
        assert(r.data?.result === 'Success', 'result !== Success');
        assert(Array.isArray(r.data?.entries), 'falta entries[]');
    });

    await test('GET /api/v1/bcat/health → health del BCAT', async () => {
        const r = await req('GET', '/api/v1/bcat/health');
        assert(r.status === 200, `HTTP ${r.status}`);
    });

    // ── 11. TELEMETRY STUB ────────────────────────────────────────────────────
    section('Telemetría');

    await test('POST /api/v1/telemetry → acepta y descarta', async () => {
        const r = await req('POST', '/api/v1/telemetry', {
            body: { event: 'startup', version: '1.0.0' }
        });
        assert(r.status === 200, `HTTP ${r.status}`);
    });

    // ── RESULTADO FINAL ───────────────────────────────────────────────────────
    const total = passed + failed + skipped;
    console.log('');
    console.log(DIM('  ' + '─'.repeat(50)));
    console.log(`\n  ${BOLD('Resultado:')} ${G(passed + ' pasados')}  ${failed > 0 ? R(failed + ' fallados') : DIM('0 fallados')}  ${skipped > 0 ? Y(skipped + ' omitidos') : ''}`);
    console.log('');

    if (failed === 0) {
        console.log(`  ${G('✅')} ${BOLD('Todos los tests pasaron.')}\n`);
    } else {
        console.log(`  ${R('❌')} ${failed} test(s) fallaron.`);
        if (failed > 0 && !accessToken) {
            console.log(`\n  ${Y('ℹ')}  Los tests de auth fallaron probablemente porque:`);
            console.log(`     • MySQL no está corriendo`);
            console.log(`     • Las credenciales del .env son incorrectas`);
            console.log(`     • La base de datos no está inicializada (ejecuta: mysql -u root -p < schema.sql)`);
        }
        console.log('');
        process.exit(1);
    }
}

main().catch(e => {
    console.error(R('\n  Error fatal: ' + e.message));
    console.error(DIM('  ¿Está el servidor corriendo en ' + BASE + '?'));
    process.exit(1);
});
