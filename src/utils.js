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

module.exports = { generateNexoId, generateRefreshToken, hashToken };
