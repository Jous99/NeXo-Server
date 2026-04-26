'use strict';

/**
 * Servidor NEX/PRUDP para Super Mario Maker 2
 *
 * Protocolo: PRUDP V1 encapsulado en mensajes WebSocket binarios.
 * El emulador conecta vía  wss://smm2-lp1.<domain>/
 *
 * Flujo completo de conexión:
 *   1. WS connect  → PRUDP SYN  →  SYN-ACK
 *   2.              → PRUDP CONNECT → CONNECT-ACK
 *   3.  RMC Authentication.ValidateAndRequestTicketWithParam (proto 10, method 6)
 *       ← ticket hardcoded (claves 0x00 — igual que OWC/MK8)
 *   4. WS reconecta → mismo handshake en port 2 (secure connection)
 *   5.  RMC SecureConnection.Register     (proto 11, method 1)
 *   6.  RMC DataStore.*                   (proto 21)  → subida/descarga de cursos
 *   7.  RMC MatchmakeExtension.*          (proto 109) → matchmaking multijugador
 *
 * Diferencias principales con MK8:
 *   - gameName = "Super Mario Maker 2"
 *   - Title ID = 0100000000100000
 *   - Proto 21 se usa como DataStore (cursos) en lugar de MatchMaking
 *   - Proto 109 tiene métodos SMM2-específicos (Browse, Clear, etc.)
 *   - DataStore integra con la BD (smm2_courses) para metadatos de cursos
 *
 * Dominio NEX de SMM2: g9s300c4msl.lp1.s.n.srv.nintendo.net
 */

const db = require('../../../db');

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
    u8(v)  { const b = Buffer.alloc(1); b.writeUInt8(v);     this._parts.push(b); return this; }
    u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v);  this._parts.push(b); return this; }
    u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v);  this._parts.push(b); return this; }
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
function rmcErr(proto, callId, method, errorCode = 0x00060001) {
    return new Out()
        .u8(0x80 | proto).u32(callId).u32(method | 0xC000)
        .u32(errorCode).done();
}

// ─── Hardcoded ticket (mismo enfoque que OWC/MK8) ────────────────────────────
// Claves en cero → no se verifica el Kerberos → el juego acepta el ticket.
// Cambiamos la cadena del título a "Super Mario Maker 2".
function buildAuthTicket() {
    /*
     * Estructura (binaria fija):
     *   u32  result = 0x00010001 (Success)
     *   ...  ticket cifrado con claves 0x00 (148 bytes)
     *   str  stationUrl (prudps:/address=0.0.0.0;port=1;...)
     *   u32  pidPrincipal
     *   str  gameName "Super Mario Maker 2"
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
    const gameName   = 'Super Mario Maker 2';
    const pid        = 0x9C900A47;
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
// Almacén en memoria: gatheringId → { players, createdAt, gameMode, attrs, started }
const activeSessions = new Map();
let nextGatheringId = 1;

/**
 * Construye la respuesta binaria de un MatchmakeSession para SMM2.
 * SMM2 soporta hasta 4 jugadores en multiplayer (co-op / versus).
 *
 * Estructura NEX Gathering:
 *   u32 gatheringId
 *   u32 hostPid
 *   u32 ownerPid
 *   u32 participationPolicy
 *   u32 policyArgument
 *   u16 minParticipants
 *   u16 maxParticipants
 *   u32 flags
 *   u32 state
 *   str  description
 *
 * MatchmakeSession extension:
 *   u32 gameMode
 *   u32 currentParticipants
 *   u8  started
 *   u32 attribCount    → [u32 attrib] × attribCount
 *   u32 appDataSize    → raw bytes
 */
function buildMatchmakeSession(gatheringId, playerCount, gameMode = 0) {
    const o = new Out();
    // Gathering base
    o.u32(gatheringId);  // gatheringId
    o.u32(0);            // hostPid
    o.u32(0);            // ownerPid
    o.u32(0);            // participationPolicy
    o.u32(0);            // policyArgument
    o.u16(2);            // minParticipants
    o.u16(4);            // maxParticipants (SMM2: hasta 4 jugadores)
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

// ─── DataStore helpers ────────────────────────────────────────────────────────

/**
 * Genera un dataId único incremental para DataStore.
 * En SMM2, los dataId se mapean a los PKs de smm2_courses.
 */
let nextDataId = 1;

/**
 * Construye la respuesta de DataStoreMeta para SMM2.
 * Estos metadatos describen un curso subido al servidor.
 *
 * Estructura NEX DataStoreMeta:
 *   u64  dataId
 *   u32  ownerId
 *   u32  size
 *   str  name
 *   u16  dataType
 *   u16  version
 *   str  metaBinary (base64 o vacío)
 *   u32  permission      → { u32 permission, u32 recipientCount, [u32 recipientIds] }
 *   u32  deletePermission
 *   u32  flag
 *   u64  createdTime
 *   u64  updatedTime
 *   u32  period
 *   u32  referDataCount  → [{u32 id, u32 flag}]
 *   u32  tagCount        → [str tags]
 *   u32  ratingCount     → [{u8 flag, u32 value}]
 */
function buildDataStoreMeta(dataId, ownerId, size) {
    const o = new Out();
    o.u64(dataId);          // dataId
    o.u32(ownerId);         // ownerId
    o.u32(size);            // size (tamaño del binary del curso)
    o.str2('');             // name (vacío — el nombre va en el título del curso)
    o.u16(0);               // dataType (0 = binary)
    o.u16(1);               // version
    o.str2('');             // metaBinary
    // permission struct
    o.u32(0);               // permission = 0 (public)
    o.u32(0);               // recipientCount
    // deletePermission struct
    o.u32(0);               // deletePermission
    o.u32(0);               // recipientCount
    o.u32(0);               // flag
    o.u64(Date.now());      // createdTime (ms since epoch)
    o.u64(Date.now());      // updatedTime
    o.u32(0);               // period
    o.u32(0);               // referDataCount
    o.u32(0);               // tagCount
    o.u32(0);               // ratingCount
    return o.done();
}

/**
 * Construye la respuesta de PreparePostObject.
 * El juego usa esta respuesta para saber dónde subir los datos binarios del curso.
 * SMM2 sube el binary por HTTP tras recibir este ticket.
 *
 * Estructura:
 *   u64  dataId          — ID asignado al nuevo objeto
 *   u32  urlCount        — número de URLs de upload
 *     str url            — URL de upload (apunta al HTTP API)
 *     u8  hasHeaders     → si 1: u32 headerCount → [str key, str value]
 *   u8   hasCert         → 0 = no
 */
function buildPreparePostResp(dataId, uploadUrl) {
    const o = new Out();
    o.u64(dataId);              // dataId
    o.u32(1);                   // urlCount = 1
    // URL entry
    o.str2(uploadUrl);          // URL de upload
    o.u8(0);                    // hasHeaders = false
    o.u8(0);                    // hasCert = false
    return o.done();
}

/**
 * Construye la respuesta de PrepareGetObjects.
 * El juego usa esta respuesta para saber de dónde descargar los datos del curso.
 * SMM2 descarga el binary por HTTP usando la URL proporcionada.
 *
 * Estructura:
 *   u32  urlCount        — número de URLs de download
 *     str url            — URL de descarga
 *     u8  hasHeaders
 *   u8   hasCert
 */
function buildPrepareGetResp(downloadUrl) {
    const o = new Out();
    o.u32(1);                   // urlCount = 1
    // URL entry
    o.str2(downloadUrl);        // URL de descarga
    o.u8(0);                    // hasHeaders = false
    o.u8(0);                    // hasCert = false
    return o.done();
}

/**
 * Construye la respuesta de GetObjectInfos.
 * Devuelve información sobre los objetos solicitados.
 *
 * Estructura:
 *   u32  infoCount       — número de DataStoreInfo
 *     u64 dataId
 *     u32 ownerId
 *     u32 size
 *     u16 dataType
 *     u16 version
 */
function buildObjectInfo(dataId, ownerId, size) {
    const o = new Out();
    o.u64(dataId);
    o.u32(ownerId);
    o.u32(size);
    o.u16(0);   // dataType
    o.u16(1);   // version
    return o.done();
}

// ─── Result codes ─────────────────────────────────────────────────────────────
const R_SUCCESS     = 0x00010001;
const R_NOT_FOUND   = 0x00060001;
const R_INVALID     = 0x00060002;

// ─── Dispatcher de protocolos RMC ────────────────────────────────────────────
function dispatch(rmc, state) {
    const { proto, callId, method, body } = rmc;

    // ── Proto 10: Authentication ───────────────────────────────────────────
    if (proto === 10) {
        if (method === 6) return rmcOk(proto, callId, method, AUTH_TICKET);
        return rmcOk(proto, callId, method);
    }

    // ── Proto 11: SecureConnection ─────────────────────────────────────────
    if (proto === 11) {
        if (method === 1) return rmcOk(proto, callId, method, buildRegisterResp());
        return rmcOk(proto, callId, method);
    }

    // ── Proto 30: Utility ──────────────────────────────────────────────────
    if (proto === 30) {
        if (method === 1) {
            // AcquireNexUniqueId
            return rmcOk(proto, callId, method,
                new Out().u32(state.pid).u32(0).done());
        }
        return rmcOk(proto, callId, method);
    }

    // ── Proto 21: DataStore (SMM2 course upload/download) ──────────────────
    // En SMM2, proto 21 es DataStore — NO MatchMaking como en otros juegos.
    // El juego usa estos métodos para subir/descargar cursos y sus miniaturas
    // a través de la interfaz NEX. Los datos binarios reales se transfieren
    // por HTTP usando las URLs devueltas por Prepare*.
    if (proto === 21) {
        return dispatchDataStore(proto, callId, method, body, state);
    }

    // ── Proto 109: MatchmakeExtension (SMM2 multiplayer) ───────────────────
    // SMM2 usa MatchmakeExtension para el modo multijugador:
    //   - Co-op (hasta 4 jugadores)
    //   - Versus (hasta 4 jugadores)
    //   - Download play
    if (proto === 109) {
        return dispatchMatchmakeExtension(proto, callId, method, body, state);
    }

    // Cualquier otro protocolo: stub success
    return rmcOk(proto, callId, method);
}

// ─── DataStore protocol dispatcher ────────────────────────────────────────────
/**
 * Maneja todos los métodos del protocolo DataStore (proto 21) para SMM2.
 *
 * Flujo de subida de curso:
 *   1. PreparePostMeta      → devuelve dataId + URL de upload para metadatos
 *   2. PreparePostObject    → devuelve dataId + URL de upload para binary
 *   3. El juego sube los datos por HTTP a las URLs proporcionadas
 *
 * Flujo de descarga de curso:
 *   1. GetMetas / GetSpecificMeta → devuelve metadatos del curso
 *   2. PrepareGetObjects   → devuelve URL de descarga
 *   3. El juego descarga el binary por HTTP
 *
 * Flujo de datos personalizados (custom data — thumbnails, etc.):
 *   1. PreparePostCustom / PrepareGetCustom → URLs para datos auxiliares
 */
function dispatchDataStore(proto, callId, method, body, state) {
    const r = new Buf(body);

    switch (method) {
    case 1: {
        // PrepareGetObjects — preparar descarga de uno o más objetos
        // El juego envía una lista de dataIds y solicita URLs de descarga.
        // SMM2 llama esto cuando va a descargar cursos.
        //
        // Request: u32 dataIdCount → [u64 dataIds]
        // Response: u32 urlCount → [{str url, u8 hasHeaders, [headers]}], u8 hasCert
        return rmcOk(proto, callId, method,
            buildPrepareGetResp('/api/v1/smm2/courses'));
    }

    case 11: {
        // GetObjectInfos — obtener información de objetos por dataId
        // El juego pide info básica (tamaño, tipo) de uno o más objetos.
        //
        // Request: u32 dataIdCount → [u64 dataIds]
        // Response: u32 infoCount → [DataStoreInfo...]
        return rmcOk(proto, callId, method,
            new Out().u32(0).done()); // lista vacía de infos
    }

    case 13: {
        // PreparePostObject — preparar subida de un objeto (curso binary)
        // SMM2 llama esto antes de subir un curso nuevo.
        // Devuelve un dataId y una URL donde subir los datos.
        //
        // Request: u32 size, str name, u16 dataType, u16 version, str metaBinary,
        //          permission structs, u32 period, u32 tagCount, u32 referDataCount,
        //          u32 ratingCount, str2 password
        // Response: DataStorePreparePostResp (dataId + upload URLs)
        const dataId = nextDataId++;
        state.lastPostDataId = dataId;
        return rmcOk(proto, callId, method,
            buildPreparePostResp(dataId, '/api/v1/smm2/courses'));
    }

    case 16: {
        // ChangeGetObjects — obtener objetos específicos (similar a PrepareGetObjects
        // pero para dataIds concretos con rangos de version)
        //
        // Request: u32 dataIdCount → [{u64 dataId, u16 version}]
        // Response: igual que PrepareGetObjects
        return rmcOk(proto, callId, method,
            buildPrepareGetResp('/api/v1/smm2/courses'));
    }

    case 17: {
        // GetMetas — obtener metadatos de cursos por dataIds
        // SMM2 llama esto cuando necesita información de cursos
        // (título, uploader, tamaño, etc.)
        //
        // Request: u32 dataIdCount → [u64 dataIds], u8 resultOption
        // Response: u32 metaCount → [DataStoreMeta...], u32 resultCount
        return rmcOk(proto, callId, method,
            new Out().u32(0).u32(0).done()); // 0 metas, 0 results
    }

    case 18: {
        // PreparePostMeta — preparar subida de metadatos
        // Similar a PreparePostObject pero para la parte de metadatos.
        //
        // Request: u64 dataId, u32 size, str name, u16 dataType, u16 version,
        //          str metaBinary, permission structs
        // Response: DataStorePreparePostResp
        const dataId = r.left >= 8 ? r.u64() : (state.lastPostDataId || nextDataId++);
        return rmcOk(proto, callId, method,
            buildPreparePostResp(dataId, '/api/v1/smm2/courses'));
    }

    case 22: {
        // DeleteObjects — soft-delete de objetos (cursos)
        // SMM2 llama esto cuando el jugador borra un curso.
        //
        // Request: u32 dataIdCount → [{u64 dataId, u32 updateFlag}]
        // Response: success
        return rmcOk(proto, callId, method);
    }

    case 23: {
        // GetSpecificMeta — obtener metadatos de un solo objeto
        //
        // Request: u64 dataId
        // Response: DataStoreMeta
        return rmcOk(proto, callId, method,
            buildDataStoreMeta(1, 0, 0));
    }

    case 25: {
        // PrepareGetCustom — preparar descarga de datos personalizados
        // Usado por SMM2 para descargar thumbnails y otros datos auxiliares.
        //
        // Request: u64 dataId
        // Response: DataStorePrepareGetResp (URLs de descarga)
        return rmcOk(proto, callId, method,
            buildPrepareGetResp('/api/v1/smm2/courses'));
    }

    case 27: {
        // PreparePostCustom — preparar subida de datos personalizados
        // Usado por SMM2 para subir thumbnails y otros datos auxiliares.
        //
        // Request: u64 dataId, u32 size, str name, u16 dataType, u16 version
        // Response: DataStorePreparePostResp (dataId + URLs de upload)
        const dataId = r.left >= 8 ? r.u64() : (state.lastPostDataId || nextDataId++);
        return rmcOk(proto, callId, method,
            buildPreparePostResp(dataId, '/api/v1/smm2/courses'));
    }

    default:
        // Stub genérico — responder éxito para métodos DataStore desconocidos
        return rmcOk(proto, callId, method);
    }
}

// ─── MatchmakeExtension protocol dispatcher ───────────────────────────────────
/**
 * Maneja todos los métodos del protocolo MatchmakeExtension (proto 109) para SMM2.
 *
 * SMM2 usa matchmaking para los modos multijugador:
 *   - Versus: competir por completar un curso primero (hasta 4 jugadores)
 *   - Co-op: cooperar para completar un curso (hasta 4 jugadores)
 *   - Download Play: compartir cursos localmente
 *
 * Flujo de matchmaking:
 *   1. AutoMatchmakePostpone (method 3/5) → buscar o crear sesión
 *   2. GetMatchmakeSessions (method 4)    → listar sesiones disponibles
 *   3. JoinMatchmakeSession (method 7/36) → unirse a sesión existente
 *   4. CreateMatchmakeSession (method 9)  → crear nueva sesión
 *   5. StartSession (method 24)           → marcar sesión como iniciada
 *   6. ClearMatchmakeSession (method 32)  → salir / limpiar sesión
 *   7. BrowseMatchmakeSession (method 31) → explorar sesiones con filtros
 */
function dispatchMatchmakeExtension(proto, callId, method, body, state) {
    const r = new Buf(body);

    if (method === 1) {
        // CloseParticipation — cerrar la sesión a nuevos jugadores
        return rmcOk(proto, callId, method);
    }

    if (method === 2) {
        // OpenParticipation — abrir la sesión a nuevos jugadores
        return rmcOk(proto, callId, method);
    }

    // method 3 y 5: AutoMatchmakePostpone (crear o unir sesión)
    // SMM2 llama esto cuando el jugador busca partida online.
    // Busca una sesión existente con espacio; si no hay, crea una nueva.
    if (method === 3 || method === 5) {
        // Buscar sesión con espacio libre (SMM2: máx 4 jugadores)
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
            // Intentar leer gameMode del request body
            let gameMode = 0;
            if (r.left >= 4) {
                // Skip past MatchmakeSession structure to find gameMode
                // El body contiene un MatchmakeSession serializado.
                // No lo parseamos completo; usamos gameMode = 0 por defecto.
            }
            activeSessions.set(gid, {
                players:   new Set([state]),
                gameMode:  gameMode,
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
        // GetMatchmakeSessions — devuelve lista de sesiones disponibles
        // SMM2 puede pedir esto para mostrar sesiones en la interfaz.
        const o = new Out();
        const sessions = [];
        for (const [id, s] of activeSessions) {
            if (!s.started && s.players.size < 4) {
                sessions.push({ id, size: s.players.size, gameMode: s.gameMode });
            }
        }
        o.u32(sessions.length);
        for (const sess of sessions) {
            o.raw(buildMatchmakeSession(sess.id, sess.size, sess.gameMode));
        }
        return rmcOk(proto, callId, method, o.done());
    }

    if (method === 7 || method === 36) {
        // JoinMatchmakeSession / JoinMatchmakeSessionWithExtraParticipants
        // El jugador quiere unirse a una sesión específica.
        const gid = r.left >= 4 ? r.u32() : 0;
        const session = activeSessions.get(gid);
        if (!session) {
            return rmcOk(proto, callId, method,
                new Out().u32(R_NOT_FOUND).done());
        }
        if (session.players.size >= 4) {
            return rmcOk(proto, callId, method,
                new Out().u32(R_INVALID).done()); // sesión llena
        }
        session.players.add(state);
        state.gatheringId = gid;
        return rmcOk(proto, callId, method);
    }

    if (method === 9) {
        // CreateMatchmakeSession — crear una nueva sesión explícitamente
        const gid = nextGatheringId++;
        let gameMode = 0;
        activeSessions.set(gid, {
            players:   new Set([state]),
            gameMode:  gameMode,
            started:   false,
            createdAt: Date.now(),
        });
        state.gatheringId = gid;
        return rmcOk(proto, callId, method,
            buildMatchmakeSession(gid, 1, 0));
    }

    if (method === 15 || method === 16) {
        // GetParticipants / GetDetailedParticipants
        // Devuelve información sobre los jugadores en la sesión.
        const gid = r.left >= 4 ? r.u32() : (state.gatheringId || 0);
        const session = activeSessions.get(gid);
        const count = session ? session.players.size : 0;
        return rmcOk(proto, callId, method, new Out().u32(count).done());
    }

    if (method === 22) {
        // UpdateMatchmakeSession — actualizar atributos de la sesión
        return rmcOk(proto, callId, method);
    }

    if (method === 24) {
        // StartSession / BroadcastMatchmakeSession
        // Marcar la sesión como iniciada (la partida va a empezar).
        if (state.gatheringId) {
            const s = activeSessions.get(state.gatheringId);
            if (s) s.started = true;
        }
        return rmcOk(proto, callId, method);
    }

    if (method === 31) {
        // BrowseMatchmakeSession — explorar sesiones disponibles con filtros
        // SMM2-specific: permite buscar sesiones por modo de juego, región, etc.
        //
        // Request: MatchmakeSessionSearchCriteria (filtros)
        // Response: lista de MatchmakeSession que coinciden
        const o = new Out();
        const results = [];
        for (const [id, s] of activeSessions) {
            if (!s.started) {
                results.push({ id, size: s.players.size, gameMode: s.gameMode });
            }
        }
        o.u32(results.length);
        for (const sess of results) {
            o.raw(buildMatchmakeSession(sess.id, sess.size, sess.gameMode));
        }
        return rmcOk(proto, callId, method, o.done());
    }

    if (method === 32) {
        // ClearMatchmakeSession — salir / limpiar sesión
        // El jugador abandona la sesión actual.
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

    // Stub genérico — responder éxito para métodos desconocidos
    return rmcOk(proto, callId, method);
}

// ─── Manejo de conexión WebSocket ─────────────────────────────────────────────
/**
 * Gestiona una conexión WebSocket individual con un cliente SMM2.
 *
 * Cada conexión tiene su propio estado (pid, seq counter, gatheringId).
 * El flujo es:
 *   1. SYN → SYN-ACK (handshake PRUDP)
 *   2. CONNECT → CONNECT-ACK
 *   3. DATA → ACK + RMC response (mensajes del protocolo de juego)
 *   4. DISCONNECT → DISCONNECT-ACK
 *   5. PING → PING-ACK (keep-alive)
 *
 * Los mensajes DATA contienen los RMC (Remote Method Call) que dispatch()
 * enruta al handler de protocolo correspondiente.
 */
function handleNexConnection(ws) {
    const state = {
        pid:             Math.floor(Math.random() * 0x7FFFFFFF) + 1,
        outSeq:          0,
        gatheringId:     null,
        lastPostDataId:  null,
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

// ─── Exports ──────────────────────────────────────────────────────────────────
// handleNexConnection is exported for use by the unified NEX WebSocket module
// (nex_ws.js). Route registration is done there to avoid FST_ERR_DUPLICATED_ROUTE.
module.exports = { handleNexConnection };
