'use strict';

/**
 * TCP PRUDP Server for Mario Kart 8 Deluxe
 *
 * Switch games use raw TCP connections with PRUDP protocol, NOT WebSocket.
 * This server listens on a TCP port and handles PRUDP packets directly.
 *
 * The existing WebSocket server (nex.js) is kept for testing/alternative use.
 *
 * Port: configurable via NEXO_MK8_TCP_PORT (default: 29900)
 */

const net = require('net');
const prudp = require('../prudp_core');
const db = require('../../../db');

const { Buf, Out, decodePRUDP, encodePRUDP, decodeRMC, rmcOk, rmcErr,
        handlePRUDPPacket, createConnectionState,
        T_SYN, T_CONNECT, T_DATA, T_DISCONNECT, T_PING,
        F_ACK, F_RELIABLE, F_NEED_ACK, F_HAS_SIZE,
        R_SUCCESS, R_NOT_FOUND, R_SESSION_FULL } = prudp;

// ─── Auth ticket (same approach as OWC — keys are 0x00) ─────────────────────
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

    // Point to the actual NEX server (this server!) instead of 0.0.0.0
    const stationUrl = `prudps:/address=${nexHost};port=${nexPort};PID=2570494370239566657;CID=1;type=2;sid=2;stream=10`;
    const gameName = 'Mario Kart 8 Deluxe';
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
    return new Out()
        .u32(0x00010001)
        .u32(0)
        .str2(url)
        .done();
}

// ─── Matchmaking sessions (in memory) ───────────────────────────────────────
const activeSessions = new Map();
let nextGatheringId = 1;

function buildMatchmakeSession(gatheringId, playerCount, gameMode = 0) {
    const o = new Out();
    o.u32(gatheringId);
    o.u32(0); o.u32(0);
    o.u32(0); o.u32(0);
    o.u16(2); o.u16(12);
    o.u32(0); o.u32(0);
    o.str2('');
    o.u32(gameMode);
    o.u32(playerCount);
    o.u8(0);
    o.u32(0); o.u32(0);
    return o.done();
}

// ─── RMC dispatcher ─────────────────────────────────────────────────────────
function createDispatcher(nexHost, nexPort) {
    const AUTH_TICKET = buildAuthTicket(nexHost, nexPort);

    return function dispatch(rmc, state) {
        const { proto, callId, method, body } = rmc;

        // Proto 10: Authentication
        if (proto === 10) {
            if (method === 6) return rmcOk(proto, callId, method, AUTH_TICKET);
            return rmcOk(proto, callId, method);
        }

        // Proto 11: SecureConnection
        if (proto === 11) {
            if (method === 1) return rmcOk(proto, callId, method, buildRegisterResp());
            return rmcOk(proto, callId, method);
        }

        // Proto 30: Utility
        if (proto === 30) {
            if (method === 1) {
                return rmcOk(proto, callId, method,
                    new Out().u32(state.pid).u32(0).done());
            }
            return rmcOk(proto, callId, method);
        }

        // Proto 21: MatchMaking (Gathering base)
        if (proto === 21) {
            if (method === 1) return rmcOk(proto, callId, method, new Out().u32(0).done());
            if (method === 2) return rmcOk(proto, callId, method, new Out().u32(0).done());
            if (method === 3) return rmcOk(proto, callId, method);
            if (method === 4) {
                if (state.gatheringId !== null) {
                    const sess = activeSessions.get(state.gatheringId);
                    if (sess) {
                        sess.players.delete(state);
                        if (sess.players.size === 0) activeSessions.delete(state.gatheringId);
                    }
                    state.gatheringId = null;
                }
                return rmcOk(proto, callId, method);
            }
            return rmcOk(proto, callId, method, new Out().u32(R_SUCCESS).done());
        }

        // Proto 109: MatchmakeExtension (MK8 matchmaking)
        if (proto === 109) {
            return dispatchMatchmakeExtension(proto, callId, method, body, state);
        }

        // Proto 0x3D (61): Ranking — MK8 uses this for leaderboards/ghost data
        if (proto === 61) {
            return dispatchRanking(proto, callId, method, body, state);
        }

        return rmcOk(proto, callId, method);
    };
}

// ─── MatchmakeExtension ──────────────────────────────────────────────────────
function dispatchMatchmakeExtension(proto, callId, method, body, state) {
    const r = new Buf(body);

    if (method === 1) return rmcOk(proto, callId, method); // CloseParticipation
    if (method === 2) return rmcOk(proto, callId, method); // OpenParticipation

    if (method === 3 || method === 5) {
        let found = null;
        for (const [id, s] of activeSessions) {
            if (!s.started && s.players.size < 12) { found = id; break; }
        }
        let gid;
        if (found) {
            gid = found;
            activeSessions.get(gid).players.add(state);
        } else {
            gid = nextGatheringId++;
            activeSessions.set(gid, {
                players: new Set([state]),
                gameMode: 0, started: false, createdAt: Date.now(),
            });
        }
        state.gatheringId = gid;
        const session = activeSessions.get(gid);
        return rmcOk(proto, callId, method,
            buildMatchmakeSession(gid, session.players.size, session.gameMode));
    }

    if (method === 4) {
        const o = new Out();
        const sessions = [];
        for (const [id, s] of activeSessions) {
            if (!s.started && s.players.size < 12) {
                sessions.push({ id, size: s.players.size, gameMode: s.gameMode });
            }
        }
        o.u32(sessions.length);
        for (const sess of sessions) o.raw(buildMatchmakeSession(sess.id, sess.size, sess.gameMode));
        return rmcOk(proto, callId, method, o.done());
    }

    if (method === 7 || method === 36) {
        const gid = r.left >= 4 ? r.u32() : 0;
        const session = activeSessions.get(gid);
        if (!session) return rmcErr(proto, callId, method, R_NOT_FOUND);
        if (session.players.size >= 12) return rmcErr(proto, callId, method, R_SESSION_FULL);
        session.players.add(state);
        state.gatheringId = gid;
        return rmcOk(proto, callId, method);
    }

    if (method === 9) {
        const gid = nextGatheringId++;
        activeSessions.set(gid, {
            players: new Set([state]), gameMode: 0, started: false, createdAt: Date.now(),
        });
        state.gatheringId = gid;
        return rmcOk(proto, callId, method, buildMatchmakeSession(gid, 1, 0));
    }

    if (method === 10) {
        const gid = r.left >= 4 ? r.u32() : (state.gatheringId || 0);
        const session = activeSessions.get(gid);
        if (!session) return rmcErr(proto, callId, method, R_NOT_FOUND);
        return rmcOk(proto, callId, method, buildMatchmakeSession(gid, session.players.size, session.gameMode));
    }

    if (method === 15 || method === 16) {
        const gid = r.left >= 4 ? r.u32() : (state.gatheringId || 0);
        const session = activeSessions.get(gid);
        const count = session ? session.players.size : 0;
        return rmcOk(proto, callId, method, new Out().u32(count).done());
    }

    if (method === 17) {
        const gid = r.left >= 4 ? r.u32() : (state.gatheringId || 0);
        const session = activeSessions.get(gid);
        if (!session) return rmcErr(proto, callId, method, R_NOT_FOUND);
        return rmcOk(proto, callId, method, buildMatchmakeSession(gid, session.players.size, session.gameMode));
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
        for (const [id, s] of activeSessions) {
            if (!s.started) results.push({ id, size: s.players.size, gameMode: s.gameMode });
        }
        o.u32(results.length);
        for (const sess of results) o.raw(buildMatchmakeSession(sess.id, sess.size, sess.gameMode));
        return rmcOk(proto, callId, method, o.done());
    }

    if (method === 32) {
        if (state.gatheringId !== null) {
            const sess = activeSessions.get(state.gatheringId);
            if (sess) {
                sess.players.delete(state);
                if (sess.players.size === 0) activeSessions.delete(state.gatheringId);
            }
            state.gatheringId = null;
        }
        return rmcOk(proto, callId, method);
    }

    if (method === 38) return rmcOk(proto, callId, method, new Out().u32(0).done());

    return rmcOk(proto, callId, method);
}

// ─── Ranking protocol (proto 61) ─────────────────────────────────────────────
function dispatchRanking(proto, callId, method, body, state) {
    switch (method) {
    case 1: { // GetRanking
        return rmcOk(proto, callId, method, new Out().u32(0).done());
    }
    case 2: { // GetApproxRanking
        return rmcOk(proto, callId, method, new Out().u32(0).done());
    }
    case 3: { // GetRankingByPIDList
        return rmcOk(proto, callId, method, new Out().u32(0).done());
    }
    default:
        return rmcOk(proto, callId, method);
    }
}

// ─── TCP Server ──────────────────────────────────────────────────────────────
function startTcpServer(host, port, nexHost, nexPort) {
    const dispatch = createDispatcher(nexHost, nexPort);

    const server = net.createServer((socket) => {
        const state = createConnectionState();
        const frags = {};

        console.log(`[MK8 NEX TCP] New connection from ${socket.remoteAddress}:${socket.remotePort}`);

        let buffer = Buffer.alloc(0);

        socket.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);

            // Try to parse PRUDP packets from the buffer
            while (buffer.length >= 12) {
                const pkt = decodePRUDP(buffer);
                if (!pkt) {
                    // Not a valid PRUDP packet, discard
                    buffer = Buffer.alloc(0);
                    break;
                }
                const totalLen = 12 + (buffer[1] || 0) + (buffer.readUInt16LE(2) || 0);
                if (buffer.length < totalLen) break; // incomplete, wait for more data

                const rawPacket = buffer.slice(0, totalLen);
                buffer = buffer.slice(totalLen);

                handlePRUDPPacket(rawPacket, state, dispatch, frags, (resp) => {
                    if (!socket.destroyed) socket.write(resp);
                });
            }
        });

        socket.on('close', () => {
            console.log(`[MK8 NEX TCP] Connection closed (pid=${state.pid})`);
            if (state.gatheringId !== null) {
                const sess = activeSessions.get(state.gatheringId);
                if (sess) {
                    sess.players.delete(state);
                    if (sess.players.size === 0) activeSessions.delete(state.gatheringId);
                }
            }
        });

        socket.on('error', (err) => {
            // Ignore connection reset etc.
        });

        // Timeout: close connection after 5 minutes of inactivity
        socket.setTimeout(300000);
        socket.on('timeout', () => {
            socket.destroy();
        });
    });

    server.listen(port, host, () => {
        console.log(`🏁 MK8 NEX TCP server listening on ${host}:${port}`);
    });

    return server;
}

module.exports = { startTcpServer, activeSessions, createDispatcher };
