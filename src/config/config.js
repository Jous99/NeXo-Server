// src/config/config.js
require('dotenv').config();

module.exports = {
    port: process.env.PORT || 443,
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        pass: process.env.DB_PASS || '',
        name: process.env.DB_NAME || 'eden_network',
        dialect: 'mysql'
    },
    raptor: {
        baseUrl: process.env.BASE_URL || 'accounts-api-lp1.raptor.network',
        accountId: "0x123456789ABCDEF"
    }
};