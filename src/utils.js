'use strict';

const crypto = require('crypto');

/**
 * Genera un "friend code" estilo Nintendo Switch: SW-XXXX-XXXX-XXXX (12 dígitos
 * en grupos de 4), para integrarse igual que el código de amigo real.
 * Usa bytes criptográficamente aleatorios.
 *
 * Para cambiar la identidad (p.ej. prefijo propio "NX-"), edita solo PREFIX.
 */
function generateNexoId() {
    const PREFIX = 'SW';
    const digits = (n) => Array.from(crypto.randomBytes(n), (b) => (b % 10).toString()).join('');
    return `${PREFIX}-${digits(4)}-${digits(4)}-${digits(4)}`;
}

/**
 * Generates a 32-byte cryptographically random token (hex, 64 chars).
 * Used for refresh tokens.
 */
function generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * SHA-256 hash of a string. Used to store refresh tokens in DB.
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a 32-byte cryptographically random NEX password (hex, 64 chars).
 * Usado como material de clave Kerberos por el servidor NEX (Go) — distinto
 * de password_hash (bcrypt, no reversible, inútil para derivar una clave).
 */
function generateNexPassword() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateNexoId, generateRefreshToken, hashToken, generateNexPassword };
