'use strict';

const bcrypt   = require('bcryptjs');
const db       = require('../../../db');
const { generateNexoId, generateRefreshToken, hashToken } = require('../../../utils');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function refreshExpiresAt() {
    const days = parseInt((process.env.JWT_REFRESH_EXPIRES || '30d').replace('d', ''));
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Returns { nexo_id, nickname }
 */
async function register({ username, email, password, nickname, lang, region }) {
    // Check uniqueness
    const [existing] = await db.query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
    );
    if (existing.length > 0) {
        const err = new Error('Username or email already in use');
        err.code  = 'CONFLICT';
        throw err;
    }

    const nexo_id     = generateNexoId();
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const nick        = nickname || username;

    await db.query(
        `INSERT INTO users (nexo_id, username, email, password_hash, nickname, lang, region)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nexo_id, username, email, password_hash, nick, lang || 'en', region || null]
    );

    // Init presence row
    await db.query('INSERT INTO presence (user_id) SELECT id FROM users WHERE nexo_id = ?', [nexo_id]);

    return { nexo_id, nickname: nick };
}

/**
 * Authenticate user. Returns { access_token, refresh_token, nexo_id, nickname }
 * The refresh_token returned is the raw token (plaintext) — store hashed in DB.
 */
async function login({ login: loginInput, password, deviceInfo, ip }) {
    const [rows] = await db.query(
        'SELECT * FROM users WHERE username = ? OR email = ? OR nexo_id = ?',
        [loginInput, loginInput, loginInput]
    );

    if (rows.length === 0) {
        const err = new Error('Invalid credentials');
        err.code  = 'UNAUTHORIZED';
        throw err;
    }

    const user = rows[0];

    if (user.is_banned) {
        const err = new Error(`Account banned: ${user.ban_reason || 'Contact support'}`);
        err.code  = 'FORBIDDEN';
        throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        const err = new Error('Invalid credentials');
        err.code  = 'UNAUTHORIZED';
        throw err;
    }

    // Create refresh token
    const rawRefresh  = generateRefreshToken();
    const hashedToken = hashToken(rawRefresh);
    const expiresAt   = refreshExpiresAt();

    await db.query(
        `INSERT INTO sessions (user_id, refresh_token, device_info, ip_address, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, hashedToken, deviceInfo || null, ip || null, expiresAt]
    );

    // Update presence
    await db.query(
        "INSERT INTO presence (user_id, status) VALUES (?, 'online') ON DUPLICATE KEY UPDATE status = 'online'",
        [user.id]
    );

    return {
        nexo_id:       user.nexo_id,
        nickname:      user.nickname,
        refresh_token: rawRefresh,   // returned to client, never stored plaintext
    };
}

/**
 * Refresh access token using a valid refresh token.
 * Returns { nexo_id } so the route can re-sign a new JWT.
 */
async function refreshSession(rawRefreshToken) {
    const hashed = hashToken(rawRefreshToken);

    const [rows] = await db.query(
        `SELECT s.*, u.nexo_id, u.is_banned
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.refresh_token = ? AND s.revoked = FALSE AND s.expires_at > NOW()`,
        [hashed]
    );

    if (rows.length === 0) {
        const err = new Error('Invalid or expired refresh token');
        err.code  = 'UNAUTHORIZED';
        throw err;
    }

    const session = rows[0];

    if (session.is_banned) {
        const err = new Error('Account banned');
        err.code  = 'FORBIDDEN';
        throw err;
    }

    return { nexo_id: session.nexo_id, session_id: session.id };
}

/**
 * Revoke a single session (logout).
 */
async function logout(rawRefreshToken) {
    const hashed = hashToken(rawRefreshToken);
    await db.query('UPDATE sessions SET revoked = TRUE WHERE refresh_token = ?', [hashed]);
}

/**
 * Revoke all sessions for a user (logout everywhere).
 */
async function logoutAll(nexoId) {
    const [users] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoId]);
    if (users.length === 0) return;
    await db.query('UPDATE sessions SET revoked = TRUE WHERE user_id = ?', [users[0].id]);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Profile
// ─────────────────────────────────────────────────────────────────────────────

async function getProfile(nexoId) {
    const [rows] = await db.query(
        `SELECT u.nexo_id, u.username, u.nickname, u.avatar_url, u.lang, u.region,
                u.created_at, p.status, p.game_title, p.last_seen
         FROM users u
         LEFT JOIN presence p ON p.user_id = u.id
         WHERE u.nexo_id = ?`,
        [nexoId]
    );
    return rows[0] || null;
}

async function updateProfile(nexoId, { nickname, avatar_url, lang, region }) {
    const fields = [];
    const values = [];

    if (nickname   !== undefined) { fields.push('nickname = ?');   values.push(nickname); }
    if (avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(avatar_url); }
    if (lang       !== undefined) { fields.push('lang = ?');       values.push(lang); }
    if (region     !== undefined) { fields.push('region = ?');     values.push(region); }

    if (fields.length === 0) return { updated: false };

    values.push(nexoId);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE nexo_id = ?`, values);
    return { updated: true };
}

async function changePassword(nexoId, { currentPassword, newPassword }) {
    const [rows] = await db.query(
        'SELECT password_hash FROM users WHERE nexo_id = ?', [nexoId]
    );
    if (rows.length === 0) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) throw Object.assign(new Error('Current password is incorrect'), { code: 'UNAUTHORIZED' });

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.query('UPDATE users SET password_hash = ? WHERE nexo_id = ?', [newHash, nexoId]);

    // Revoke all sessions after password change for security
    await logoutAll(nexoId);

    return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Friends
// ─────────────────────────────────────────────────────────────────────────────

async function sendFriendRequest(requesterNexoId, addresseeNexoId) {
    if (requesterNexoId === addresseeNexoId) {
        throw Object.assign(new Error('Cannot add yourself'), { code: 'BAD_REQUEST' });
    }

    const [req] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [requesterNexoId]);
    const [adr] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [addresseeNexoId]);

    if (!req.length || !adr.length) {
        throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
    }

    const requesterId = req[0].id;
    const addresseeId = adr[0].id;

    // Check for existing relation
    const [existing] = await db.query(
        `SELECT status FROM friends
         WHERE (requester_id = ? AND addressee_id = ?)
            OR (requester_id = ? AND addressee_id = ?)`,
        [requesterId, addresseeId, addresseeId, requesterId]
    );

    if (existing.length > 0) {
        const st = existing[0].status;
        if (st === 'accepted') throw Object.assign(new Error('Already friends'), { code: 'CONFLICT' });
        if (st === 'pending')  throw Object.assign(new Error('Request already sent'), { code: 'CONFLICT' });
        if (st === 'blocked')  throw Object.assign(new Error('Cannot send request'), { code: 'FORBIDDEN' });
    }

    await db.query(
        'INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, ?)',
        [requesterId, addresseeId, 'pending']
    );

    return { success: true };
}

async function respondFriendRequest(addresseeNexoId, requesterNexoId, accept) {
    const [req] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [requesterNexoId]);
    const [adr] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [addresseeNexoId]);

    if (!req.length || !adr.length) {
        throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
    }

    const [rows] = await db.query(
        'SELECT id FROM friends WHERE requester_id = ? AND addressee_id = ? AND status = ?',
        [req[0].id, adr[0].id, 'pending']
    );

    if (!rows.length) throw Object.assign(new Error('Friend request not found'), { code: 'NOT_FOUND' });

    if (accept) {
        await db.query('UPDATE friends SET status = ? WHERE id = ?', ['accepted', rows[0].id]);
    } else {
        await db.query('DELETE FROM friends WHERE id = ?', [rows[0].id]);
    }

    return { success: true };
}

async function removeFriend(nexoIdA, nexoIdB) {
    const [a] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoIdA]);
    const [b] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoIdB]);

    if (!a.length || !b.length) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    await db.query(
        `DELETE FROM friends
         WHERE (requester_id = ? AND addressee_id = ?)
            OR (requester_id = ? AND addressee_id = ?)`,
        [a[0].id, b[0].id, b[0].id, a[0].id]
    );

    return { success: true };
}

async function getFriends(nexoId) {
    const [user] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoId]);
    if (!user.length) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    const uid = user[0].id;

    const [rows] = await db.query(
        `SELECT
            u.nexo_id, u.nickname, u.avatar_url,
            p.status AS online_status, p.game_title, p.last_seen,
            f.status AS friendship_status,
            CASE WHEN f.requester_id = ? THEN 'sent' ELSE 'received' END AS direction
         FROM friends f
         JOIN users u ON u.id = IF(f.requester_id = ?, f.addressee_id, f.requester_id)
         LEFT JOIN presence p ON p.user_id = u.id
         WHERE (f.requester_id = ? OR f.addressee_id = ?)
           AND f.status IN ('accepted', 'pending')
           AND u.is_banned = FALSE
         ORDER BY p.status DESC, u.nickname ASC`,
        [uid, uid, uid, uid]
    );

    return rows;
}

async function blockUser(requesterNexoId, targetNexoId) {
    const [req] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [requesterNexoId]);
    const [tgt] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [targetNexoId]);

    if (!req.length || !tgt.length) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    const requesterId = req[0].id;
    const targetId    = tgt[0].id;

    // Remove any existing friendship first
    await db.query(
        `DELETE FROM friends
         WHERE (requester_id = ? AND addressee_id = ?)
            OR (requester_id = ? AND addressee_id = ?)`,
        [requesterId, targetId, targetId, requesterId]
    );

    // Insert block
    await db.query(
        'INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, ?)',
        [requesterId, targetId, 'blocked']
    );

    return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Presence
// ─────────────────────────────────────────────────────────────────────────────

async function updatePresence(nexoId, { status, game_title, game_id }) {
    const [user] = await db.query('SELECT id FROM users WHERE nexo_id = ?', [nexoId]);
    if (!user.length) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    await db.query(
        `INSERT INTO presence (user_id, status, game_title, game_id)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), game_title = VALUES(game_title), game_id = VALUES(game_id)`,
        [user[0].id, status, game_title || null, game_id || null]
    );

    return { success: true };
}

module.exports = {
    register,
    login,
    refreshSession,
    logout,
    logoutAll,
    getProfile,
    updateProfile,
    changePassword,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    getFriends,
    blockUser,
    updatePresence,
};
