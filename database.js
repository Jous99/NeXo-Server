const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'tu_usuario_mysql', // El que crees en aaPanel
    database: 'tu_base_datos',
    password: 'tu_password',
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool.promise();