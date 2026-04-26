'use strict';

/**
 * PRUDP V1 Core Protocol — shared between TCP and WebSocket transports.
 *
 * Nintendo Switch games use PRUDP (Reliable UDP) over TCP to communicate
 * with NEX servers. This module provides the protocol layer that both
 * the TCP server and the WebSocket server use.
 *
 * Protocol flow:
 *   1. SYN → SYN-ACK          (connection handshake)
 *   2. CONNECT → CONNECT-ACK  (session establishment)
 *   3. DATA → ACK + DATA      (RMC request/response)
 *   4. DISCONNECT → DISCONNECT-ACK
 *   5. PING → PING-ACK        (keep-alive)
 *
 * RMC (Remote Method Call) is the application protocol on top of PRUDP.
 * Each game registers its own RMC dispatcher.
 */

// ─── PRUDP V1 Constants ─────────────────────────────────────────────────────
const T_SYN = 0, T_CONNECT = 1, T_DATA = 2, T_DISCONNECT = 3, T_PING = 4;
const F_ACK = 1, F_RELIABLE = 2, F_NEED_ACK = 4, F_HAS_SIZE = 8;
const O_SUPPORT = 0, O_CONN_SIG = 1;
const MAGIC = 0x80;

// ─── Binary read/write helpers ──────────────────────────────────────────────
class Buf {
    constructor(src) {
        this.b = Buffer.isBuffer(src) ? src : Buffer.from(src || []);
        this.p = 0;
    }
    u8() { return this.b.readUInt8(this.p++); }
    u16() { const v = this.b.readUInt16LE(this.p); this.p += 2; return v; }
    u32() { const v = this.b.readUInt32LE(this.p); this.p += 4; return v; }
    u64() {
        const lo = this.b.readUInt32LE(this.p); this.p += 4;
        const hi = this.b.readUInt32LE(this.p); this.p += 4;
        return hi * 0x100000000 + lo;
    }
    skip(n) { this.p += n; }
    slice(n) { const v = this.b.slice(this.p, this.p + n); this.p += n; return v; }
    get left() { return this.b.length - this.p; }
}

class Out {
    constructor() { this._parts = []; }
    u8(v) { const b = Buffer.alloc(1); b.writeUInt8(v); this._parts.push(b); return this; }
    u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v); this._parts.push(b); return this; }
    u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v); this._parts.push(b); return this; }
    u64(v) {
        const b = Buffer.alloc(8);
        b.writeUInt32LE(v & 0xFFFFFFFF, 0);
        b.writeUInt32LE(Math.floor(v / 0x100000000) & 0xFFFFFFFF, 4);
        this._parts.push(b); return this;
    }
    raw(b) { this._parts.push(Buffer.isBuffer(b) ? b : Buffer.from(b)); return this; }
    str2(s) { const b = Buffer.from(s + '\0', 'utf8'); this.u16(b.length); this.raw(b); return this; }
    done() { return Buffer.concat(this._parts); }
}

// ─── PRUDP decode ────────────────────────────────────────────────────────────
function decodePRUDP(data) {
    const b = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (b.length < 12) return null;
    const r = new Buf(b);
    if (r.u8() !== MAGIC) return null;

    const optLen = r.u8();
    const payLen = r.u16();
    if (b.length < 12 + optLen + payLen) return null;

    const st = r.u8();
    const srcType = st >> 4, dstType = st & 0xF;
    const srcPort = r.u8();
    const dstPort = r.u8();
    const fragId = r.u8();
    const tf = r.u16();
    const type = tf & 0xF, flags = tf >> 4;
    const seqId = r.u16();

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

// ─── PRUDP encode ────────────────────────────────────────────────────────────
function encodePRUDP({ srcType, dstType, srcPort, dstPort, fragId = 0,
                       type, flags, seqId = 0, connSig, payload = Buffer.alloc(0) }) {
    const opts = new Out();
    if (type === T_SYN || type === T_CONNECT) {
        opts.u8(O_SUPPORT).u8(4).u32(0);
    }
    if (type === T_SYN && (flags & F_ACK)) {
        const sig = connSig || Buffer.alloc(16);
        opts.u8(O_CONN_SIG).u8(sig.length).raw(sig);
    }
    const optBuf = opts.done();
    const pay = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);

    return new Out()
        .u8(MAGIC).u8(optBuf.length).u16(pay.length)
        .u8((srcType << 4) | dstType).u8(srcPort).u8(dstPort).u8(fragId)
        .u16(type | (flags << 4)).u16(seqId)
        .raw(optBuf).raw(pay)
        .done();
}

// ─── RMC message decode/encode ───────────────────────────────────────────────
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

function rmcErr(proto, callId, method, errorCode = 0x00060001) {
    return new Out()
        .u8(0x80 | proto).u32(callId).u32(method | 0xC000)
        .u32(errorCode).done();
}

// ─── Result codes ────────────────────────────────────────────────────────────
const R_SUCCESS = 0x00010001;
const R_NOT_FOUND = 0x00060001;
const R_SESSION_FULL = 0x00060002;
const R_INVALID = 0x00060002;

// ─── Connection state factory ────────────────────────────────────────────────
function createConnectionState(extra = {}) {
    return {
        pid: Math.floor(Math.random() * 0x7FFFFFFF) + 1,
        outSeq: 0,
        gatheringId: null,
        ...extra,
    };
}

// ─── Handle a single PRUDP message (used by both TCP and WS) ────────────────
function handlePRUDPPacket(raw, state, dispatch, frags, send) {
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
        if (pkt.flags & F_ACK) break;
        resp = encodePRUDP({
            srcType: pkt.dstType, dstType: pkt.srcType,
            srcPort: pkt.dstPort, dstPort: pkt.srcPort,
            type: T_CONNECT, flags: F_ACK, seqId: 1,
        });
        break;
    }
    case T_DATA: {
        // ACK
        const ack = encodePRUDP({
            srcType: pkt.dstType, dstType: pkt.srcType,
            srcPort: pkt.dstPort, dstPort: pkt.srcPort,
            type: T_DATA, flags: F_ACK, seqId: pkt.seqId,
        });
        send(ack);

        // Fragmentation
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

    if (resp) send(resp);
}

module.exports = {
    Buf, Out,
    decodePRUDP, encodePRUDP,
    decodeRMC, rmcOk, rmcErr,
    handlePRUDPPacket, createConnectionState,
    T_SYN, T_CONNECT, T_DATA, T_DISCONNECT, T_PING,
    F_ACK, F_RELIABLE, F_NEED_ACK, F_HAS_SIZE,
    R_SUCCESS, R_NOT_FOUND, R_SESSION_FULL, R_INVALID,
    MAGIC,
};
