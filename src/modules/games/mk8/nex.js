'use strict';

/**
 * Servidor NEX/PRUDP para Mario Kart 8 Deluxe
 *
 * Protocolo: PRUDP V1 encapsulado en mensajes WebSocket binarios.
 * El emulador conecta vía  wss://mk8-lp1.<domain>/
 *
 * Flujo completo de conexión:
 *   1. WS connect  → PRUDP SYN  →  SYN-ACK
 *   2.              → PRUDP CONNECT → CONNECT-ACK
 *   3.  RMC Authentication.ValidateAndRequestTicketWithParam (proto 10, method 6)
 *       ← ticket hardcoded (claves 0x00 — igual que OWC para SMM2)
 *   4. WS reconecta → mismo handshake en port 2 (secure connection)
 *   5.  RMC SecureConnection.Register     (proto 11, method 1)
 *   6.  RMC MatchmakeExtension.*          (proto 109)  → sala de juego
 */

// ─── Constantes PRUDP V1 ─────────────────────────────────────────────────────
const T_SYN  = 0, T_CONNECT = 1, T_DATA = 2, T_DISCONNECT = 3, T_PING = 4;
const F_ACK  = 1, F_RELIABLE = 2, F_NEED_ACK = 4, F_HAS_SIZE = 8;
const O_SUPPORT = 0, O_CONN_SIG = 1, O_CONN_SIG_LITE = 128;
const MAGIC = 0x80;

// ─── Lectura / escritura binaria ──────────────────────────────────────────────
class Buf {
    constructor(src) {
        this.b = Buffer.isBuffer(src) ? src : Buffer.from(src || []);
        this.p = 0;
    }
    u8()  { return this.b.readUInt8(this.p++); }
    u16() { const v = this.b.readUInt16LE(this.p); this.p += 2; return v; }
    u32() { const v = this.b.readUInt32LE(this.p); this.p += 4; return v; }
    skip(n) { this.p += n; }
    slice(n) { const v = this.b.slice(this.p, this.p + n); this.p += n; return v; }
    get left() { return this.b.length - this.p; }
}

class Out {
    constructor() { this._parts = []; }
    u8(v)  { const b = Buffer.alloc(1); b.writeUInt8(v);     this._parts.push(b); return this; }
    u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v);  this._parts.push(b); return this; }
    u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v);  this._parts.push(b); return this; }
    raw(b) { this._parts.push(Buffer.isBuffer(b) ? b : Buffer.from(b)); return this; }
    str2(s) { const b = Buffer.from(s + '\0', 'utf8'); this.u16(b.length); this.raw(b); return this; }
    done() { return Buffer.concat(this._parts); }
}

// ─── PRUDP decode ─────────────────────────────────────────────────────────────
function decodePRUDP(data) {
    const b = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (b.length < 12) return null;
    const r = new Buf(b);
    if (r.u8() !== MAGIC) return null;

    const optLen  = r.u8();
    const payLen  = r.u16();
    if (b.length < 12 + optLen + payLen) return null;

    const st       = r.u8();
    const srcType  = st >> 4, dstType = st & 0xF;
    const srcPort  = r.u8();
    const dstPort  = r.u8();
    const fragId   = r.u8();
    const tf       = r.u16();
    const type     = tf & 0xF, flags = tf >> 4;
    const seqId    = r.u16();

    const opts = {};
    const ob = new Buf(r.slice(optLen));
    while (ob.left >= 2) {
        const ot = ob.u8(), ol = ob.u8();
        if (ob.left < ol) break;
        opts[ot] = ob.slice(ol);
    }
    const payload = r.slice(payLen);
    return { srcType, dstType, srcPort, dstPort, fragId, type, flags, seqId, opts, payload };
}

// ─── PRUDP encode ─────────────────────────────────────────────────────────────
function encodePRUDP({ srcType, dstType, srcPort, dstPort, fragId = 0,
                       type, flags, seqId = 0, connSig, payload = Buffer.alloc(0) }) {
    const opts = new Out();
    if (type === T_SYN || type === T_CONNECT) {
        opts.u8(O_SUPPORT).u8(4).u32(0); // minor/supported-functions = 0
    }
    if (type === T_SYN && (flags & F_ACK)) {
        const sig = connSig || Buffer.alloc(16);
        opts.u8(O_CONN_SIG).u8(sig.length).raw(sig);
    }
    const optBuf = opts.done();
    const pay    = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);

    return new Out()
        .u8(MAGIC).u8(optBuf.length).u16(pay.length)
        .u8((srcType << 4) | dstType).u8(srcPort).u8(dstPort).u8(fragId)
        .u16(type | (flags << 4)).u16(seqId)
        .raw(optBuf).raw(pay)
        .done();
}

// ─── RMC message decode/encode ────────────────────────────────────────────────
function decodeRMC(payload) {
    if (!payload || payload.length < 9) return null;
    const r = new Buf(payload);
    return { proto: r.u8(), callId: r.u32(), method: r.u32(), body: r.slice(r.left) };
}
function rmcOk(proto, callId, method, body = Buffer.alloc(0)) {
    return new Out()
        .u8(0x80 | proto).u32(callId).u32(method | 0x8000)
        .raw(body).done();
}

// ─── Hardcoded ticket (mismo enfoque que OWC/SMM2) ───────────────────────────
// Claves en cero → no se verifica el Kerberos → el juego acepta el ticket.
// Cambiamos la cadena del título a "Mario Kart 8 Deluxe".
function buildAuthTicket() {
    /*
     * Estructura (binaria fija):
     *   u32  result = 0x00010001 (Success)
     *   ...  ticket cifrado con claves 0x00 (148 bytes)
     *   str  stationUrl (prudps:/address=0.0.0.0;port=1;...)
     *   u32  pidPrincipal
     *   str  gameName "Mario Kart 8 Deluxe"
     *   str  nexUniqueId (32 ceros)
     */
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

    const stationUrl = 'prudps:/address=0.0.0.0;port=1;PID=2570494370239566657;CID=1;type=2;sid=2;stream=10';
    const gameName   = 'Mario Kart 8 Deluxe';
    const pid        = 0x9C900A47; // mismo que OWC (sin importancia)
    const nexId      = '0'.repeat(32);

    const o = new Out();
    o.raw(ticketBytes);
    // stationUrl: u16-len prefixed
    const suBuf = Buffer.from(stationUrl + '\0', 'utf8');
    o.u16(suBuf.length).raw(suBuf);
    // pid
    o.u32(pid);
    // gameName: u16-len prefixed
    const gnBuf = Buffer.from(gameName + '\0', 'utf8');
    o.u16(gnBuf.length).raw(gnBuf);
    // nexId: u16-len prefixed (32 chars + null)
    const niDBuf = Buffer.from(nexId + '\0', 'utf8');
    o.u16(niDBuf.length).raw(niDBuf);

    return o.done();
}
const AUTH_TICKET = buildAuthTicket();

// ─── SecureConnection.Register response ──────────────────────────────────────
function buildRegisterResp() {
    const url = 'prudps:/address=0.0.0.0;port=1;PID=0;CID=1;type=2;sid=2;stream=10';
    return new Out()
        .u32(0x00010001) // Success
        .u32(0)          // connectionId
        .str2(url)
        .done();
}

// ─── Sesiones de matchmaking ──────────────────────────────────────────────────
// Almacén en memoria: gatheringId → { players, createdAt, attrs }
const activeSessions = new Map();
let nextGatheringId = 1;

function buildMatchmakeSession(gatheringId, playerCount, gameMode = 0) {
    const o = new Out();
    // Gathering base
    o.u32(gatheringId);  // gatheringId
    o.u32(0);            // hostPid
    o.u32(0);            // ownerPid
    o.u32(0);            // participationPolicy
    o.u32(0);            // policyArgument
    o.u16(2);            // minParticipants
    o.u16(12);           // maxParticipants (MK8: hasta 12)
    o.u32(0);            // flags
    o.u32(0);            // state
    o.str2('');          // description
    // MatchmakeSession specific
    o.u32(gameMode);         // gameMode
    o.u32(playerCount);      // currentParticipants
    o.u8(0);                 // started: false
    o.u32(0);                // attrib count
    o.u32(0);                // appData size
    return o.done();
}

// ─── Dispatcher de protocolos RMC ────────────────────────────────────────────
function dispatch(rmc, state) {
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
            // AcquireNexUniqueId
            return rmcOk(proto, callId, method,
                new Out().u32(state.pid).u32(0).done());
        }
        return rmcOk(proto, callId, method);
    }

    // Proto 21: MatchMaking (Gathering base)
    if (proto === 21) {
        if (method === 1) {
            // FindByType
            return rmcOk(proto, callId, method, new Out().u32(0).done());
        }
        return rmcOk(proto, callId, method, new Out().u32(0x00010001).done());
    }

    // Proto 109: MatchmakeExtension (MK8 matchmaking)
    if (proto === 109) {
        const r = new Buf(body);

        if (method === 1) {
            // CloseParticipation
            return rmcOk(proto, callId, method);
        }

        if (method === 2) {
            // OpenParticipation
            return rmcOk(proto, callId, method);
        }

        // method 3 y 5: AutoMatchmakePostpone (crear o unir sesión)
        if (method === 3 || method === 5) {
            // Buscar sesión con espacio libre
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
                    players:   new Set([state]),
                    gameMode:  0,
                    started:   false,
                    createdAt: Date.now(),
                });
            }
            state.gatheringId = gid;
            const session = activeSessions.get(gid);

            return rmcOk(proto, callId, method,
                buildMatchmakeSession(gid, session.players.size, session.gameMode));
        }

        if (method === 4) {
            // GetMatchmakeSessions — devuelve lista vacía
            return rmcOk(proto, callId, method, new Out().u32(0).done());
        }

        if (method === 7 || method === 36) {
            // JoinMatchmakeSession / JoinMatchmakeSessionWithExtraParticipants
            const gid = r.left >= 4 ? r.u32() : 0;
            const session = activeSessions.get(gid);
            if (!session) {
                return rmcOk(proto, callId, method,
                    new Out().u32(0x00060001).done()); // not found
            }
            session.players.add(state);
            state.gatheringId = gid;
            return rmcOk(proto, callId, method);
        }

        if (method === 9) {
            // CreateMatchmakeSession
            const gid = nextGatheringId++;
            activeSessions.set(gid, {
                players:   new Set([state]),
                gameMode:  0,
                started:   false,
                createdAt: Date.now(),
            });
            state.gatheringId = gid;
            return rmcOk(proto, callId, method,
                buildMatchmakeSession(gid, 1, 0));
        }

        if (method === 15 || method === 16) {
            // GetParticipants / GetDetailedParticipants
            const gid = r.left >= 4 ? r.u32() : (state.gatheringId || 0);
            const session = activeSessions.get(gid);
            const count = session ? session.players.size : 0;
            return rmcOk(proto, callId, method, new Out().u32(count).done());
        }

        if (method === 22) {
            // UpdateMatchmakeSession
            return rmcOk(proto, callId, method);
        }

        if (method === 24) {
            // StartSession / BroadcastMatchmakeSession
            if (state.gatheringId) {
                const s = activeSessions.get(state.gatheringId);
                if (s) s.started = true;
            }
            return rmcOk(proto, callId, method);
        }

        // Stub genérico — responder éxito para métodos desconocidos
        return rmcOk(proto, callId, method);
    }

    // Cualquier otro protocolo: stub success
    return rmcOk(proto, callId, method);
}

// ─── Manejo de conexión WebSocket ─────────────────────────────────────────────
function handleNexConnection(ws) {
    const state = {
        pid:          Math.floor(Math.random() * 0x7FFFFFFF) + 1,
        outSeq:       0,
        gatheringId:  null,
    };

    // Buffer de fragmentos para mensajes de varios paquetes
    const frags = {};

    ws.on('message', (data) => {
        const raw = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const pkt = decodePRUDP(raw);
        if (!pkt) return;

        let resp = null;

        switch (pkt.type) {
        case T_SYN: {
            resp = encodePRUDP({
                srcType: pkt.dstType, dstType: pkt.srcType,
                srcPort: pkt.dstPort, dstPort: pkt.srcPort,
                type: T_SYN, flags: F_ACK, seqId: 0,
                connSig: Buffer.alloc(16),
            });
            break;
        }
        case T_CONNECT: {
            if (pkt.flags & F_ACK) break; // ya es un ACK, ignorar
            resp = encodePRUDP({
                srcType: pkt.dstType, dstType: pkt.srcType,
                srcPort: pkt.dstPort, dstPort: pkt.srcPort,
                type: T_CONNECT, flags: F_ACK, seqId: 1,
            });
            break;
        }
        case T_DATA: {
            // ACK inmediato
            const ack = encodePRUDP({
                srcType: pkt.dstType, dstType: pkt.srcType,
                srcPort: pkt.dstPort, dstPort: pkt.srcPort,
                type: T_DATA, flags: F_ACK, seqId: pkt.seqId,
            });
            if (ws.readyState === 1) ws.send(ack);

            // Fragmentación
            const key = `${pkt.srcPort}:${pkt.dstPort}`;
            if (pkt.fragId !== 0) {
                if (!frags[key]) frags[key] = [];
                frags[key].push(pkt.payload);
                break;
            }
            let full = pkt.payload;
            if (frags[key] && frags[key].length) {
                full = Buffer.concat([...frags[key], pkt.payload]);
                frags[key] = [];
            }

            const rmc = decodeRMC(full);
            if (!rmc) break;

            const rmcResp = dispatch(rmc, state);
            resp = encodePRUDP({
                srcType: pkt.dstType, dstType: pkt.srcType,
                srcPort: pkt.dstPort, dstPort: pkt.srcPort,
                type: T_DATA, flags: F_RELIABLE | F_NEED_ACK | F_HAS_SIZE,
                seqId: ++state.outSeq, fragId: 0,
                payload: rmcResp,
            });
            break;
        }
        case T_DISCONNECT: {
            resp = encodePRUDP({
                srcType: pkt.dstType, dstType: pkt.srcType,
                srcPort: pkt.dstPort, dstPort: pkt.srcPort,
                type: T_DISCONNECT, flags: F_ACK, seqId: pkt.seqId,
            });
            break;
        }
        case T_PING: {
            resp = encodePRUDP({
                srcType: pkt.dstType, dstType: pkt.srcType,
                srcPort: pkt.dstPort, dstPort: pkt.srcPort,
                type: T_PING, flags: F_ACK, seqId: pkt.seqId,
            });
            break;
        }
        }

        if (resp && ws.readyState === 1) ws.send(resp);
    });

    ws.on('close', () => {
        if (state.gatheringId !== null) {
            const sess = activeSessions.get(state.gatheringId);
            if (sess) {
                sess.players.delete(state);
                if (sess.players.size === 0) activeSessions.delete(state.gatheringId);
            }
        }
    });

    ws.on('error', () => {}); // ignorar errores de red
}

// ─── Plugin Fastify ───────────────────────────────────────────────────────────
async function mk8NexRoutes(fastify) {
    // El emulador conecta a wss://mk8-lp1.<domain>/
    // Con @fastify/websocket, registrar un handler { websocket:true } en la misma
    // ruta que el GET normal es válido: Fastify los despacha por protocolo.
    fastify.get('/nex', { websocket: true }, (socket, req) => {
        if (req.subdomain !== 'mk8-lp1') { socket.close(); return; }
        handleNexConnection(socket);
    });

    // Alias raíz — algunos builds del emulador conectan sin path
    fastify.get('/ws', { websocket: true }, (socket, req) => {
        if (req.subdomain !== 'mk8-lp1') { socket.close(); return; }
        handleNexConnection(socket);
    });
}

module.exports = mk8NexRoutes;
