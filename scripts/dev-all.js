#!/usr/bin/env node
/**
 * NeXoNetwork — Orquestador de desarrollo
 *
 * `npm run dev` arranca Node (con --watch) y, si Go está instalado y
 * NEXO_MK8_* está configurado en .env, también compila y arranca
 * nex-server/mk8-auth. Si falta cualquiera de los dos, sigue solo con
 * Node — nex-server es opcional en desarrollo (ver nex-server/README.md).
 *
 * El build de Go (spawnSync, bloqueante) se hace ANTES de arrancar Node:
 * si se hiciera después de spawn(node), spawnSync bloquearía el event loop
 * y silenciaría la salida del proceso Node ya arrancado hasta que terminase.
 */

'use strict';

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT           = path.resolve(__dirname, '..');
const NEX_SERVER_DIR = path.join(ROOT, 'nex-server');
const BIN_NAME        = process.platform === 'win32' ? 'mk8-auth.exe' : 'mk8-auth';

const children = [];

function log(label, color, msg) {
    process.stdout.write(`\x1b[${color}m[${label}]\x1b[0m ${msg}\n`);
}

function pipePrefixed(child, label, color) {
    const prefix = `\x1b[${color}m[${label}]\x1b[0m `;
    const forward = (stream, out) => {
        stream.on('data', (chunk) => {
            chunk.toString().split('\n').filter(Boolean).forEach((line) => out.write(prefix + line + '\n'));
        });
    };
    forward(child.stdout, process.stdout);
    forward(child.stderr, process.stderr);
}

function startNode() {
    const node = spawn(process.execPath, ['--watch', 'src/server.js'], { cwd: ROOT, env: process.env });
    pipePrefixed(node, 'node', '36'); // cyan
    children.push(node);
    node.on('exit', (code) => {
        children.filter((c) => c !== node).forEach((c) => c.kill());
        process.exit(code ?? 0);
    });
}

// Localiza el binario de Go de forma robusta. aaPanel/PM2 arrancan con un PATH
// mínimo que a menudo NO incluye /usr/local/go/bin, así que "go" no se encuentra
// aunque esté instalado. Orden: 1) variable GO_BIN del .env  2) el PATH actual
// 3) rutas de instalación típicas.  Devuelve la ruta al binario o null.
let GO_PATH = null;
function resolveGo() {
    require('dotenv').config({ path: path.join(ROOT, '.env') });
    if (process.env.GO_BIN && fs.existsSync(process.env.GO_BIN)) return process.env.GO_BIN;

    const finder = process.platform === 'win32' ? 'where' : 'which';
    const probe = spawnSync(finder, ['go'], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.trim()) {
        return probe.stdout.trim().split(/\r?\n/)[0].trim();
    }

    const home = process.env.HOME || process.env.USERPROFILE || '';
    const candidates = process.platform === 'win32'
        ? ['C:\\Program Files\\Go\\bin\\go.exe', 'C:\\Go\\bin\\go.exe']
        : ['/usr/local/go/bin/go', '/usr/lib/go/bin/go', '/opt/go/bin/go',
           '/snap/bin/go', '/usr/bin/go', home && path.join(home, 'go', 'bin', 'go')];
    for (const c of candidates) {
        if (c && fs.existsSync(c)) return c;
    }
    return null;
}

// Env con el directorio de Go añadido al PATH, para que `go build` y su toolchain
// funcionen aunque el PATH del proceso venga vacío (caso aaPanel/PM2).
function goEnv() {
    const dir = path.dirname(GO_PATH);
    return { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH || ''}` };
}

// Compila nex-server (síncrono, antes de arrancar nada). Devuelve true si
// hay que arrancarlo, false si toca saltárselo.
function prepareGo() {
    if (!fs.existsSync(NEX_SERVER_DIR)) return false;

    GO_PATH = resolveGo();
    if (!GO_PATH || spawnSync(GO_PATH, ['version'], { stdio: 'ignore' }).error) {
        log('nex-go', '33', 'Go no está instalado o no se encuentra — saltando nex-server. ' +
            'Si Go SÍ está instalado, añade GO_BIN=/ruta/a/go en tu .env. Ver nex-server/README.md.');
        return false;
    }

    require('dotenv').config({ path: path.join(ROOT, '.env') });
    if (!process.env.NEXO_MK8_ACCESS_KEY || !process.env.NEXO_MK8_SECURE_PASSWORD) {
        log('nex-go', '33', 'NEXO_MK8_ACCESS_KEY / NEXO_MK8_SECURE_PASSWORD sin configurar en .env — saltando nex-server.');
        return false;
    }

    log('nex-go', '33', `Compilando nex-server (${GO_PATH})...`);
    const build = spawnSync(GO_PATH, ['build', '-o', BIN_NAME, './cmd/mk8-auth'], { cwd: NEX_SERVER_DIR, env: goEnv() });
    if (build.status !== 0) {
        log('nex-go', '31', 'Falló la compilación de nex-server:');
        process.stderr.write(build.stderr);
        return false;
    }

    return true;
}

function startGo() {
    const go = spawn(path.join(NEX_SERVER_DIR, BIN_NAME), [], { cwd: NEX_SERVER_DIR, env: process.env });
    pipePrefixed(go, 'nex-go', '33'); // amarillo
    children.push(go);
}

function shutdown() {
    children.forEach((c) => c.kill());
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const goReady = prepareGo();
startNode();
if (goReady) startGo();
