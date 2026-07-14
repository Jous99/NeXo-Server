'use strict';

const crypto = require('crypto');

/**
 * Generates a unique NexoID in the format NXID-XXXX-XXXX-XXXX
 * Uses cryptographically random bytes, uppercase alphanumeric.
 */
function generateNexoId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,I,1)
    const rand  = (n) => Array.from(crypto.randomBytes(n))
        .map(b => chars[b % chars.length]).join('');
    return `NXID-${rand(4)}-${rand(4)}-${rand(4)}`;
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
