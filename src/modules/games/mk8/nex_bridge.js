'use strict';

/**
 * nex_bridge.js — Puente TCP transparente entre el emulador y nex-go.
 *
 * DESCUBRIMIENTO CLAVE (confirmado en el log del emulador):
 * ---------------------------------------------------------------------------
 * El emulador NeXo habla PRUDP sobre **WebSocket-Secure** (prudpws): abre TCP,
 * hace TLS, y manda un "GET / HTTP/1.1 ... Upgrade: websocket". Y nex-go
 * (mk8-auth / mk8-secure de Pretendo) TAMBIÉN habla WSS. Es decir: ambos lados
 * hablan lo mismo; solo hay que juntarlos.
 *
 * Por eso el puente NO descifra ni parsea nada: es un simple PROXY TCP. Acepta
 * la conexión del emulador en `tcpPort` (29900, abierto en el firewall) y copia
 * los bytes crudos, en ambos sentidos, contra nex-go en goHost:goPort
 * (127.0.0.1:60000). El handshake TLS + WebSocket y todo el PRUDP/NEX ocurren de
 * EXTREMO A EXTREMO entre el emulador y nex-go; el puente solo mueve bytes. Así
 * evitamos por completo los problemas de certificados, subprotocolos y framing.
 *
 *   emulador ──TCP──▶ [PUENTE 29900] ──TCP──▶ nex-go 60000
 *            (dentro van TLS + WebSocket + PRUDP, intactos de punta a punta)
 *
 * Se activa con NEXO_MK8_BRIDGE=true (ver server.js).
 */

const net = require('net');

// host/tcpPort: dónde escucha el puente (donde conecta el emulador).
// goHost/goPort: el servidor NEX real (nex-go), normalmente 127.0.0.1:60000.
function startBridge(host, tcpPort, goHost, goPort) {
    const server = net.createServer((client) => {
        const who = `${client.remoteAddress}:${client.remotePort}`;
        let up = 0, down = 0, closed = false;

        // Conexión hacia nex-go (una por conexión de emulador).
        const upstream = net.connect(goPort, goHost);
        console.log(`[MK8 PUENTE] ${who}  →  ${goHost}:${goPort} (proxy TCP)`);

        // Contadores (no consumen el stream; pipe sigue funcionando aparte).
        client.on('data',   (d) => { up   += d.length; });
        upstream.on('data', (d) => { down += d.length; });

        // El corazón del puente: copiar bytes en ambos sentidos.
        client.pipe(upstream);
        upstream.pipe(client);

        const close = (motivo) => {
            if (closed) return;
            closed = true;
            console.log(`[MK8 PUENTE] cierre ${who} (${motivo})  emulador→nexgo=${up}B  nexgo→emulador=${down}B`);
            client.destroy();
            upstream.destroy();
        };
        client.on('close',   () => close('emulador cerró'));
        upstream.on('close', () => close('nex-go cerró'));
        client.on('error',   () => {});
        upstream.on('error', (e) => {
            console.error(`[MK8 PUENTE] error hacia nex-go (${who}): ${e.message}. ` +
                `¿Está mk8-auth escuchando en ${goHost}:${goPort}?`);
        });

        // Corte por inactividad (5 min) para no acumular conexiones colgadas.
        client.setTimeout(300000, () => close('timeout'));
    });

    server.on('error', (err) => {
        console.error(`⚠️  MK8 PUENTE no pudo arrancar en ${host}:${tcpPort} (${err.code || err.message}). ` +
            `La web sigue funcionando; el multijugador de MK8 quedará desactivado.`);
    });

    server.listen(tcpPort, host, () => {
        console.log(`🌉 MK8 PUENTE [v4-tcpproxy] escuchando en ${host}:${tcpPort}  →  ${goHost}:${goPort}`);
    });

    return server;
}

module.exports = { startBridge };
