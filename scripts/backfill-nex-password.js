#!/usr/bin/env node
/**
 * NeXoNetwork — Backfill de nex_password para cuentas existentes
 *
 * Las cuentas creadas antes de añadir el servidor de auth NEX en Go no tienen
 * nex_password (columna añadida por scripts/migrate-nex-pid.sql). Este script
 * rellena una para cada una — no se puede hacer en SQL puro porque necesita
 * crypto.randomBytes de Node.
 *
 * Uso: node scripts/backfill-nex-password.js
 */

'use strict';

require('dotenv').config();

const db = require('../src/db');
const { generateNexPassword } = require('../src/utils');

async function main() {
    const [rows] = await db.query(
        'SELECT id FROM users WHERE nex_password IS NULL'
    );

    if (rows.length === 0) {
        console.log('Nada que rellenar — todas las cuentas ya tienen nex_password.');
        process.exit(0);
    }

    console.log(`Rellenando nex_password para ${rows.length} cuenta(s)...`);

    for (const { id } of rows) {
        await db.query(
            'UPDATE users SET nex_password = ? WHERE id = ?',
            [generateNexPassword(), id]
        );
    }

    console.log('Listo.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error en el backfill:', err);
    process.exit(1);
});
