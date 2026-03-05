const Sequelize = require('sequelize');

// Configuración para XAMPP (Base de datos: eden_network)
const sequelize = new Sequelize('eden_network', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false, // Consola limpia
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
});

const db = {};

// Importación manual del modelo para evitar errores de lectura de archivos
db.User = require('./User')(sequelize, Sequelize.DataTypes);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;