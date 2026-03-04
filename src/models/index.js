// src/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.pass, {
    host: config.db.host,
    dialect: config.db.dialect,
    logging: false
});

const User = sequelize.define('User', {
    uuid: { type: DataTypes.STRING(64), primaryKey: true },
    username: { type: DataTypes.STRING(32), allowNull: false },
    token: { type: DataTypes.STRING(255), defaultValue: 'eden_token' }
});

const initDatabase = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        console.log("🗄️  [Database] Connected and Synced.");
    } catch (error) {
        console.error("❌ [Database] Error:", error);
    }
};

// ¡ESTO ES LO MÁS IMPORTANTE!
module.exports = { User, initDatabase, sequelize };