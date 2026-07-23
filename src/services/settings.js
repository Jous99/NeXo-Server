'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  Ajustes globales del sitio (tabla site_settings).
//  Clave/valor con una cache en memoria muy corta para no golpear la DB en
//  cada request (p. ej. el check de registros abiertos).
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../db');

const CACHE_TTL_MS = 5000;
let cache = null;        // { key: value }
let cacheAt = 0;

async function loadAll() {
    const now = Date.now();
    if (cache && now - cacheAt < CACHE_TTL_MS) {
        return cache;
    }
    const [rows] = await db.query('SELECT setting_key, setting_value FROM site_settings');
    cache = {};
    for (const r of rows) {
        cache[r.setting_key] = r.setting_value;
    }
    cacheAt = now;
    return cache;
}

function invalidate() {
    cache = null;
    cacheAt = 0;
}

/** Devuelve el valor de una clave (string) o el valor por defecto. */
async function get(key, fallback = null) {
    const all = await loadAll();
    return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : fallback;
}

/** Devuelve todos los ajustes como objeto plano. */
async function all() {
    return { ...(await loadAll()) };
}

/** Crea o actualiza una clave. */
async function set(key, value) {
    await db.query(
        `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value === null || value === undefined ? null : String(value)]
    );
    invalidate();
}

/** true si los registros están abiertos (valor '1'/'true'). Por defecto abiertos. */
async function registrationsEnabled() {
    const v = await get('registrations_enabled', '1');
    return v === '1' || v === 'true' || v === 1 || v === true;
}

/** Mensaje que se muestra cuando los registros están cerrados. */
async function registrationsClosedMessage() {
    return await get('registrations_closed_message', 'Los registros están cerrados temporalmente.');
}

module.exports = {
    get, set, all, invalidate,
    registrationsEnabled, registrationsClosedMessage,
};
