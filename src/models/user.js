const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        // ✅ Definimos PID (Imagen 8)
        pid: {
            type: DataTypes.INTEGER,
            allowNull: true,
            unique: true
        },
        // ✅ Definimos ROLE (Imagen 7)
        role: {
            type: DataTypes.STRING,
            defaultValue: 'user'
        },
        friend_code: {
            type: DataTypes.STRING,
            allowNull: true
        }
    });

    return User;
};