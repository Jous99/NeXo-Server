#!/usr/bin/env node
/**
 * NeXoNetwork — Migración de NexoID al friend code estilo Nintendo.
 *
 * Convierte los NexoID antiguos "NXID-XXXX-XXXX-XXXX" al nuevo formato
 * "SW-XXXX-XXXX-XXXX" (12 dígitos). Los amigos y el PID de NEX se guardan por
 * el id numérico, así que cambiar el nexo_id NO rompe amistades ni partidas.
 *
 * IMPORTANTE: el nexo_id viaja dentro del token (raptor_token). Tras migrar,
 * cada usuario debe CERRAR SESIÓN y volver a entrar en el emulador/consola para
 * obtener un token nuevo con su friend code actualizado.
 *
 * Uso (en el servidor):  node scripts/migrate-friendcode.js
 */

'use strict';

require('dotenv').config();

const db = require('../src/db');
const { generateNexoId } = require('../src/utils');

// Asigna un friend code único al usuario, reintentando si hay colisión (la
// columna nexo_id es UNIQUE).
async function assignUniqueCode(userId) {
    for (let attempt = 0; attempt < 15; attempt++) {
        const code = generateNexoId();
        try {
            await db.query('UPDATE users SET nexo_id = ? WHERE id = ?', [code, userId]);
            return code;
        } catch (err) {
            if (err && err.code === 'ER_DUP_ENTRY') continue; // colisión, reintenta
            throw err;
        }
    }
    throw new Error(`No se pudo generar un friend code único para el usuario ${userId}`);
}

async function main() {
    // Solo migra las cuentas que aún tienen el formato viejo.
    const [rows] = await db.query(
        "SELECT id, username, nexo_id FROM users WHERE nexo_id LIKE 'NXID-%'"
    );

    if (rows.length === 0) {
        console.log('Nada que migrar — no hay cuentas con formato NXID-.');
        process.exit(0);
    }

    console.log(`Migrando ${rows.length} cuenta(s) al formato SW-...\n`);
    for (const u of rows) {
        const code = await assignUniqueCode(u.id);
        console.log(`  ${String(u.username).padEnd(16)} ${u.nexo_id}  ->  ${code}`);
    }

    console.log('\n✅ Migración completada.');
    console.log('⚠️  Cada usuario debe cerrar sesión y volver a iniciarla en el');
    console.log('    emulador para que su token recoja el nuevo friend code.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en la migración:', err.message || err);
    process.exit(1);
});
