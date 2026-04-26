'use strict';

/**
 * TCP PRUDP Server for Super Mario Maker 2
 *
 * SMM2 uses DataStore (proto 21) for course upload/download and
 * MatchmakeExtension (proto 109) for multiplayer.
 *
 * Port: configurable via NEXO_SMM2_TCP_PORT (default: 29901)
 */

const net = require('net');
const prudp = require('../prudp_core');
const db = require('../../../db');

const { Buf, Out, decodePRUDP, encodePRUDP, decodeRMC, rmcOk, rmcErr,
        handlePRUDPPacket, createConnectionState,
        T_SYN, T_CONNECT, T_DATA, T_DISCONNECT, T_PING,
        F_ACK, F_RELIABLE, F_NEED_ACK, F_HAS_SIZE,
        R_SUCCESS, R_NOT_FOUND, R_INVALID } = prudp;

// ─── Auth ticket ─────────────────────────────────────────────────────────────
function buildAuthTicket(nexHost, nexPort) {
    const ticketBytes = Buffer.from([
        0,54,1,0,0,1,0,0,0,0,0,0,0,148,0,0,0,
        0xDE,0x18,0x89,0x41,0xA3,0x37,0x5D,0x3A,0x8A,0x06,0x1E,0x67,
        0x57,0x6E,0x92,0x6D,0xC7,0x1A,0x7F,0xA3,0xF0,0xCC,0xEB,0x97,
        0x45,0x2B,0x4D,0x32,0x27,0x96,0x5F,0x9E,0x19,0x22,0xF3,0xD8,
        0x74,0xA6,0x28,0xC6,0x19,0x7A,0xA5,0xCB,0x20,0xFC,0x22,0x19,
        0x29,0xAE,0x8C,0xA9,0xE0,0xC2,0xD4,0xDC,0xBB,0xB2,0x7C,0x27,
        0x6F,0x7E,0xE5,0xEE,0xD2,0xA0,0xC3,0x58,0xA3,0x55,0x9D,0x0B,
        0x4F,0x0F,0xB0,0x12,0xFB,0x4F,0x73,0x8F,0x86,0x3E,0x35,0x26,
        0x6F,0x26,0x0A,0x1C,0xB8,0x07,0xE6,0xB8,0x84,0xEA,0x78,0x3E,
        0x2C,0x95,0xE8,0x96,0x24,0xD5,0x22,0x32,0x44,0x7D,0xD0,0xBA,
        0x4F,0x5E,0xB4,0x36,0x08,0x22,0x86,0x62,0x4C,0xB1,0x53,0x56,
        0xA5,0x88,0xAD,0x64,0x95,0xBD,0xA7,0x1E,0x15,0xA7,0xDE,0x2C,
        0x0C,0xD8,0xE8,0xB1,0xC8,0x5F,0xFB,0x56,0xE4,0xC0,0x5B,0x43,
        0x3C,0x5E,0xA0,0x5F,0x53,
    ]);

    const stationUrl = `prudps:/address=${nexHost};port=${nexPort};PID=2570494370239566657;CID=1;type=2;sid=2;stream=10`;
    const gameName = 'Super Mario Maker 2';
    const pid = 0x9C900A47;
    const nexId = '0'.repeat(32);

    const o = new Out();
    o.raw(ticketBytes);
    const suBuf = Buffer.from(stationUrl + '\0', 'utf8');
    o.u16(suBuf.length).raw(suBuf);
    o.u32(pid);
    const gnBuf = Buffer.from(gameName + '\0', 'utf8');
    o.u16(gnBuf.length).raw(gnBuf);
    const niDBuf = Buffer.from(nexId + '\0', 'utf8');
    o.u16(niDBuf.length).raw(niDBuf);
    return o.done();
}

function buildRegisterResp() {
    const url = 'prudps:/address=0.0.0.0;port=1;PID=0;CID=1;type=2;sid=2;stream=10';
    return new Out().u32(0x00010001).u32(0).str2(url).done();
}

// ─── Matchmaking sessions ────────────────────────────────────────────────────
const activeSessions = new Map();
let nextGatheringId = 1;
let nextDataId = 1;

function buildMatchmakeSession(gatheringId, playerCount, gameMode = 0) {
    const o = new Out();
    o.u32(gatheringId); o.u32(0); o.u32(0);
    o.u32(0); o.u32(0);
    o.u16(2); o.u16(4);  // SMM2: max 4 players
    o.u32(0); o.u32(0);
    o.str2('');
    o.u32(gameMode);
    o.u32(playerCount);
    o.u8(0);
    o.u32(0); o.u32(0);
    return o.done();
}

// ─── DataStore helpers ───────────────────────────────────────────────────────
function buildDataStoreMeta(dataId, ownerId, size) {
    const o = new Out();
    o.u64(dataId); o.u32(ownerId); o.u32(size);
    o.str2(''); o.u16(0); o.u16(1); o.str2('');
    o.u32(0); o.u32(0);  // permission + recipients
    o.u32(0); o.u32(0);  // deletePermission + recipients
    o.u32(0);             // flag
    o.u64(Date.now()); o.u64(Date.now());
    o.u32(0); o.u32(0); o.u32(0); o.u32(0);
    return o.done();
}

function buildPreparePostResp(dataId, uploadUrl) {
    const o = new Out();
    o.u64(dataId); o.u32(1);
    o.str2(uploadUrl); o.u8(0); o.u8(0);
    return o.done();
}

function buildPrepareGetResp(downloadUrl) {
    const o = new Out();
    o.u32(1);
    o.str2(downloadUrl); o.u8(0); o.u8(0);
    return o.done();
}

// ─── RMC dispatcher ─────────────────────────────────────────────────────────
function createDispatcher(nexHost, nexPort, baseDomain) {
    const AUTH_TICKET = buildAuthTicket(nexHost, nexPort);
    const courseBaseUrl = `https://smm2-lp1.${baseDomain}/api/v1/smm2/courses`;

    return function dispatch(rmc, state) {
        const { proto, callId, method, body } = rmc;

        if (proto === 10) {
            if (method === 6) return rmcOk(proto, callId, method, AUTH_TICKET);
            return rmcOk(proto, callId, method);
        }
        if (proto === 11) {
            if (method === 1) return rmcOk(proto, callId, method, buildRegisterResp());
            return rmcOk(proto, callId, method);
        }
        if (proto === 30) {
            if (method === 1) return rmcOk(proto, callId, method, new Out().u32(state.pid).u32(0).done());
            return rmcOk(proto, callId, method);
        }
        if (proto === 21) {
            return dispatchDataStore(proto, callId, method, body, state, courseBaseUrl);
        }
        if (proto === 109) {
            return dispatchMatchmakeExtension(proto, callId, method, body, state);
        }
        return rmcOk(proto, callId, method);
    };
}

// ─── DataStore protocol (proto 21) ──────────────────────────────────────────
function dispatchDataStore(proto, callId, method, body, state, courseBaseUrl) {
    const r = new Buf(body);

    switch (method) {
    case 1: return rmcOk(proto, callId, method, buildPrepareGetResp(courseBaseUrl));
    case 11: return rmcOk(proto, callId, method, new Out().u32(0).done());
    case 13: {
        const dataId = nextDataId++;
        state.lastPostDataId = dataId;
        return rmcOk(proto, callId, method, buildPreparePostResp(dataId, courseBaseUrl));
    }
    case 16: return rmcOk(proto, callId, method, buildPrepareGetResp(courseBaseUrl));
    case 17: return rmcOk(proto, callId, method, new Out().u32(0).u32(0).done());
    case 18: {
        const dataId = r.left >= 8 ? r.u64() : (state.lastPostDataId || nextDataId++);
        return rmcOk(proto, callId, method, buildPreparePostResp(dataId, courseBaseUrl));
    }
    case 22: return rmcOk(proto, callId, method);
    case 23: return rmcOk(proto, callId, method, buildDataStoreMeta(1, 0, 0));
    case 25: return rmcOk(proto, callId, method, buildPrepareGetResp(courseBaseUrl));
    case 27: {
        const dataId = r.left >= 8 ? r.u64() : (state.lastPostDataId || nextDataId++);
        return rmcOk(proto, callId, method, buildPreparePostResp(dataId, courseBaseUrl));
    }
    default: return rmcOk(proto, callId, method);
    }
}

// ─── MatchmakeExtension (proto 109) ─────────────────────────────────────────
function dispatchMatchmakeExtension(proto, callId, method, body, state) {
    const r = new Buf(body);

    if (method === 1 || method === 2) return rmcOk(proto, callId, method);

    if (method === 3 || method === 5) {
        let found = null;
        for (const [id, s] of activeSessions) {
            if (!s.started && s.players.size < 4) { found = id; break; }
        }
        let gid;
        if (found) {
            gid = found;
            activeSessions.get(gid).players.add(state);
        } else {
            gid = nextGatheringId++;
            activeSessions.set(gid, {
                players: new Set([state]), gameMode: 0, started: false, createdAt: Date.now(),
            });
        }
        state.gatheringId = gid;
        const session = activeSessions.get(gid);
        return rmcOk(proto, callId, method, buildMatchmakeSession(gid, session.players.size, session.gameMode));
    }

    if (method === 4) {
        const o = new Out();
        const sessions = [];
        for (const [id, s] of activeSessions) {
            if (!s.started && s.players.size < 4) sessions.push({ id, size: s.players.size, gameMode: s.gameMode });
        }
        o.u32(sessions.length);
        for (const sess of sessions) o.raw(buildMatchmakeSession(sess.id, sess.size, sess.gameMode));
        return rmcOk(proto, callId, method, o.done());
    }

    if (method === 7 || method === 36) {
        const gid = r.left >= 4 ? r.u32() : 0;
        const session = activeSessions.get(gid);
        if (!session) return rmcOk(proto, callId, method, new Out().u32(R_NOT_FOUND).done());
        if (session.players.size >= 4) return rmcOk(proto, callId, method, new Out().u32(R_INVALID).done());
        session.players.add(state);
        state.gatheringId = gid;
        return rmcOk(proto, callId, method);
    }

    if (method === 9) {
        const gid = nextGatheringId++;
        activeSessions.set(gid, { players: new Set([state]), gameMode: 0, started: false, createdAt: Date.now() });
        state.gatheringId = gid;
        return rmcOk(proto, callId, method, buildMatchmakeSession(gid, 1, 0));
    }

    if (method === 15 || method === 16) {
        const gid = r.left >= 4 ? r.u32() : (state.gatheringId || 0);
        const session = activeSessions.get(gid);
        return rmcOk(proto, callId, method, new Out().u32(session ? session.players.size : 0).done());
    }

    if (method === 22) return rmcOk(proto, callId, method);

    if (method === 24) {
        if (state.gatheringId) {
            const s = activeSessions.get(state.gatheringId);
            if (s) s.started = true;
        }
        return rmcOk(proto, callId, method);
    }

    if (method === 31) {
        const o = new Out();
        const results = [];
        for (const [id, s] of activeSessions) { if (!s.started) results.push({ id, size: s.players.size, gameMode: s.gameMode }); }
        o.u32(results.length);
        for (const sess of results) o.raw(buildMatchmakeSession(sess.id, sess.size, sess.gameMode));
        return rmcOk(proto, callId, method, o.done());
    }

    if (method === 32) {
        if (state.gatheringId !== null) {
            const sess = activeSessions.get(state.gatheringId);
            if (sess) { sess.players.delete(state); if (sess.players.size === 0) activeSessions.delete(state.gatheringId); }
            state.gatheringId = null;
        }
        return rmcOk(proto, callId, method);
    }

    return rmcOk(proto, callId, method);
}

// ─── TCP Server ──────────────────────────────────────────────────────────────
function startTcpServer(host, port, nexHost, nexPort, baseDomain) {
    const dispatch = createDispatcher(nexHost, nexPort, baseDomain);

    const server = net.createServer((socket) => {
        const state = createConnectionState({ lastPostDataId: null });
        const frags = {};

        console.log(`[SMM2 NEX TCP] New connection from ${socket.remoteAddress}:${socket.remotePort}`);

        let buffer = Buffer.alloc(0);

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);

            while (buffer.length >= 12) {
                const pkt = decodePRUDP(buffer);
                if (!pkt) { buffer = Buffer.alloc(0); break; }
                const totalLen = 12 + (buffer[1] || 0) + (buffer.readUInt16LE(2) || 0);
                if (buffer.length < totalLen) break;

                const rawPacket = buffer.slice(0, totalLen);
                buffer = buffer.slice(totalLen);

                handlePRUDPPacket(rawPacket, state, dispatch, frags, (resp) => {
                    if (!socket.destroyed) socket.write(resp);
                });
            }
        });

        socket.on('close', () => {
            console.log(`[SMM2 NEX TCP] Connection closed (pid=${state.pid})`);
            if (state.gatheringId !== null) {
                const sess = activeSessions.get(state.gatheringId);
                if (sess) { sess.players.delete(state); if (sess.players.size === 0) activeSessions.delete(state.gatheringId); }
            }
        });

        socket.on('error', () => {});
        socket.setTimeout(300000);
        socket.on('timeout', () => { socket.destroy(); });
    });

    server.listen(port, host, () => {
        console.log(`🍄 SMM2 NEX TCP server listening on ${host}:${port}`);
    });

    return server;
}

module.exports = { startTcpServer, activeSessions, createDispatcher };
