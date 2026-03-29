'use strict';

const mysql = require('mysql2/promise');

let pool;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host:               process.env.DB_HOST     || '127.0.0.1',
            port:     parseInt(process.env.DB_PORT      || '3306'),
            user:               process.env.DB_USER     || 'nexo',
            password:           process.env.DB_PASSWORD || '',
            database:           process.env.DB_NAME     || 'nexo_network',
            connectionLimit:  parseInt(process.env.DB_POOL_SIZE || '10'),
            waitForConnections: true,
            queueLimit:         0,
            charset:            'utf8mb4',
            timezone:           'Z',
        });
    }
    return pool;
}

/**
 * Execute a parameterized query.
 * @param {string} sql
 * @param {any[]}  params
 * @returns {Promise<[any[], any]>}
 */
async function query(sql, params = []) {
    return getPool().execute(sql, params);
}

/**
 * Run multiple queries inside a single transaction.
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 */
async function transaction(fn) {
    const conn = await getPool().getConnection();
    await conn.beginTransaction();
    try {
        const result = await fn(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = { query, transaction };
