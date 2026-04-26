'use strict';

/**
 * Unified NEX/PRUDP WebSocket Server
 *
 * Both MK8 and SMM2 register the SAME routes (/nex, /ws) via WebSocket,
 * which causes Fastify to throw FST_ERR_DUPLICATED_ROUTE.
 *
 * This module registers the routes ONCE and dispatches to the correct
 * game handler based on the subdomain:
 *   mk8-lp1  → MK8 NEX handler
 *   smm2-lp1 → SMM2 NEX handler
 */

const mk8Nex  = require('./mk8/nex');
const smm2Nex = require('./smm2/nex');

// We need to extract the handleNexConnection from each module.
// Both modules export a Fastify plugin that registers routes.
// Instead, we'll import their internal handlers directly by reading
// the module's exported handler or reconstructing the dispatch logic.
//
// Since mk8/nex.js and smm2/nex.js export Fastify plugins (not the handlers),
// we need to refactor slightly. The simplest approach: create wrapper handlers
// that reconstruct the per-game PRUDP logic.
//
// Actually, both modules define their own Buf/Out/decodePRUDP/encodePRUDP
// classes internally, AND their own handleNexConnection + dispatch functions.
// We cannot easily call them from outside because they're not exported.
//
// SOLUTION: Modify mk8/nex.js and smm2/nex.js to export their handler
// functions, then this module registers the routes ONCE and dispatches.

async function nexWsRoutes(fastify) {
    // Main NEX WebSocket endpoint — dispatches by subdomain
    fastify.get('/nex', { websocket: true }, (socket, req) => {
        const sub = req.subdomain;
        if (sub === 'mk8-lp1') {
            mk8Nex.handleNexConnection(socket);
        } else if (sub === 'smm2-lp1') {
            smm2Nex.handleNexConnection(socket);
        } else {
            socket.close();
        }
    });

    // Alias — some emulator builds connect without /nex path
    fastify.get('/ws', { websocket: true }, (socket, req) => {
        const sub = req.subdomain;
        if (sub === 'mk8-lp1') {
            mk8Nex.handleNexConnection(socket);
        } else if (sub === 'smm2-lp1') {
            smm2Nex.handleNexConnection(socket);
        } else {
            socket.close();
        }
    });
}

module.exports = nexWsRoutes;
