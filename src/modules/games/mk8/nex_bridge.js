'use strict';

/**
 * nex_bridge.js — Puente PRUDP entre el emulador y el servidor NEX real (Go).
 *
 * ¿Por qué existe este puente?
 * ---------------------------------------------------------------------------
 * El emulador NeXo habla PRUDP*Lite* (los paquetes empiezan por el magic 0x80)
 * sobre TLS "crudo" (el esquema `prudps`): abre un socket TCP, hace handshake
 * SSL y manda los paquetes Lite uno detrás de otro por ese stream.
 *
 * El servidor Go (nex-go de Pretendo Network) habla EXACTAMENTE ese mismo
 * PRUDPLite, pero sobre WebSocket-Secure (WSS): cada paquete Lite viaja como
 * un mensaje binario dentro de una conexión WebSocket sobre TLS.
 *
 * Es decir: el FORMATO de paquete es el mismo; lo único que cambia es el
 * TRANSPORTE (TLS crudo vs. WebSocket). Este puente traduce solo el transporte:
 *
 *   emulador ──(TLS crudo, paquetes Lite)──▶ [PUENTE] ──(WSS, msgs binarios)──▶ nex-go
 *   emulador ◀─(TLS crudo, paquetes Lite)── [PUENTE] ◀─(WSS, msgs binarios)── nex-go
 *
 * El puente NO toca los bytes de cada paquete: extrae paquetes Lite completos
 * del stream del emulador y los reenvía tal cual como mensajes WebSocket, y
 * viceversa. Todo el NEX "de verdad" (firmas PRUDP, Kerberos, matchmaking) lo
 * hace nex-go. El stub antiguo (nex_tcp.js) se queda para referencia.
 *
 * Se activa con NEXO_MK8_BRIDGE=true (ver server.js).
 */

const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ─── TLS para el lado emulador (prudps) ──────────────────────────────────────
// Mismo criterio que el stub: el emulador NO verifica el cert (verify_option=0),
// así que vale el autofirmado del servidor. Override con NEXO_NEX_TLS_CERT/KEY.
function loadNexTlsOptions() {
    const root = path.join(__dirname, '../../../../');
    const candidates = [
        [process.env.NEXO_NEX_TLS_CERT, process.env.NEXO_NEX_TLS_KEY],
        [path.join(root, 'certs/server.crt'), path.join(root, 'certs/server.key')],
        [path.join(root, 'certs/nex-server.crt'), path.join(root, 'certs/nex-server.key')],
    ];
    for (const [certPath, keyPath] of candidates) {
        if (!certPath || !keyPath) continue;
        try {
            const opts = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
            opts._certPath = certPath;
            return opts;
        } catch { /* siguiente candidato */ }
    }
    return null;
}

// ─── Extracción de paquetes PRUDPLite del stream TCP ─────────────────────────
// Cabecera Lite: [0]=magic 0x80  [1]=optLen  [2..3]=payLen (u16 LE)  +8 bytes de
// cabecera fija → total = 12 + optLen + payLen. Devuelve [paquetes, resto].
// El "resto" es un paquete incompleto que hay que esperar a completar.
function extractLitePackets(buffer) {
    const packets = [];
    let buf = buffer;
    while (buf.length >= 12) {
        if (buf[0] !== 0x80) {
            // No es un paquete Lite (desincronización). Descartamos para no
            // quedarnos atascados; el emulador reintenta el handshake.
            buf = Buffer.alloc(0);
            break;
        }
        const optLen = buf[1];
        const payLen = buf.readUInt16LE(2);
        const totalLen = 12 + optLen + payLen;
        if (buf.length < totalLen) break; // incompleto: esperar más datos
        packets.push(buf.slice(0, totalLen));
        buf = buf.slice(totalLen);
    }
    return [packets, buf];
}

// ─── Servidor puente ─────────────────────────────────────────────────────────
// host/tcpPort: dónde escucha el puente (donde conecta el emulador, p.ej. 29900).
// goWssUrl:     URL WebSocket del servidor Go (p.ej. wss://127.0.0.1:60000/).
function startBridge(host, tcpPort, goWssUrl) {
    const tlsOpts = loadNexTlsOptions();

    const onConnection = (socket) => {
        const who = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[MK8 PUENTE] Conexión del emulador ${who}  →  ${goWssUrl}`);

        let buffer = Buffer.alloc(0);
        const outbox = [];        // paquetes en cola hasta que el WS esté abierto
        let wsOpen = false;
        let tx = 0, rx = 0;       // contadores para depurar el flujo
        let firstChunk = true;    // para volcar los primeros bytes del emulador

        // Conexión WebSocket al servidor Go (una por conexión de emulador, para
        // que nex-go vea cada emulador como un cliente distinto).
        const ws = new WebSocket(goWssUrl, { rejectUnauthorized: false });

        ws.on('open', () => {
            console.log(`[MK8 PUENTE] WS a nex-go ABIERTO (${who})`);
            wsOpen = true;
            for (const p of outbox) { ws.send(p); tx++; }
            outbox.length = 0;
        });
        ws.on('message', (data) => {
            // Respuesta de nex-go: un paquete Lite → al emulador tal cual.
            rx++;
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
            if (rx <= 3) console.log(`[MK8 PUENTE] ←Go ${buf.length}B: ${buf.slice(0, 24).toString('hex')}`);
            if (!socket.destroyed) socket.write(buf);
        });
        ws.on('error', (e) => console.error(`[MK8 PUENTE] error WS (${who}): ${e.message}`));
        ws.on('unexpected-response', (_req, res) => {
            console.error(`[MK8 PUENTE] nex-go rechazó el WebSocket (${who}): HTTP ${res.statusCode}. ` +
                `¿Ruta o puerto WSS incorrectos?`);
        });
        ws.on('close', () => { if (!socket.destroyed) socket.destroy(); });

        socket.on('data', (data) => {
            // DIAGNÓSTICO: volcar los primeros bytes que manda el emulador tras TLS.
            if (firstChunk) {
                firstChunk = false;
                const head = data.slice(0, 32);
                console.log(`[MK8 PUENTE] emulador→ primer chunk ${data.length}B: ${head.toString('hex')}`);
                // ¿Es un upgrade WebSocket? ("GET " = 0x47 0x45 0x54 0x20)
                if (head.slice(0, 4).toString() === 'GET ') {
                    console.log('[MK8 PUENTE] ⚠️  El emulador habla WebSocket (prudpws), NO PRUDPLite crudo. ' +
                        'Hay que proxyar WS↔WS (cambio de plan, pero MÁS simple).');
                } else if (head[0] === 0x80) {
                    console.log('[MK8 PUENTE] ✓ Primer byte 0x80 = PRUDPLite crudo, como esperábamos.');
                } else {
                    console.log(`[MK8 PUENTE] ❓ Primer byte 0x${head[0].toString(16)} — formato desconocido.`);
                }
            }
            buffer = Buffer.concat([buffer, data]);
            const [packets, rest] = extractLitePackets(buffer);
            buffer = rest;
            // Si hay bytes acumulados pero no salió ningún paquete, avisamos con el
            // primer byte (para ver si NO es 0x80 = no es PRUDPLite crudo).
            if (packets.length === 0 && buffer.length > 0) {
                console.log(`[MK8 PUENTE] sin paquete completo aún (buffer=${buffer.length}B, ` +
                    `byte0=0x${buffer[0].toString(16)})`);
            }
            for (const p of packets) {
                if (wsOpen) { ws.send(p); tx++; }
                else outbox.push(p);
            }
        });
        socket.on('close', () => {
            console.log(`[MK8 PUENTE] Cierre ${who}  (→Go=${tx}, ←Go=${rx})`);
            try {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
            } catch { /* ya cerrado */ }
        });
        socket.on('error', () => { /* reset de conexión, etc. */ });

        socket.setTimeout(300000);
        socket.on('timeout', () => socket.destroy());
    };

    const server = tlsOpts
        ? tls.createServer(tlsOpts, onConnection)
        : net.createServer(onConnection);

    if (tlsOpts) {
        console.log(`[MK8 PUENTE] TLS activado (prudps) — cert: ${tlsOpts._certPath}`);
    } else {
        console.warn('[MK8 PUENTE] ⚠️  Sin certificados TLS. El emulador usa prudps y ' +
            'NO conectará sin TLS. Genera certs/server.{crt,key} o define NEXO_NEX_TLS_CERT/KEY.');
    }

    // Si el listen falla (puerto ocupado, etc.) NO tumbamos la web.
    server.on('error', (err) => {
        console.error(`⚠️  MK8 PUENTE no pudo arrancar en ${host}:${tcpPort} (${err.code || err.message}). ` +
            `La web sigue funcionando; el multijugador de MK8 quedará desactivado.`);
    });

    server.listen(tcpPort, host, () => {
        console.log(`🌉 MK8 PUENTE [v3-diag] escuchando TLS en ${host}:${tcpPort}  →  ${goWssUrl}`);
    });

    return server;
}

module.exports = { startBridge, extractLitePackets };
