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
        // PID: Identificador principal de 9 dígitos para el emulador
        pid: {
            type: DataTypes.INTEGER,
            allowNull: true,
            unique: true
        },
        // Friend Code: Código visible para compartir (formato XXXX-XXXX-XXXX)
        friend_code: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: 'user'
        }
    }, {
        hooks: {
            beforeCreate: (user) => {
                // Genera un PID aleatorio de 9 dígitos si no existe
                if (!user.pid) {
                    user.pid = Math.floor(100000000 + Math.random() * 900000000);
                }
                
                // Genera un Friend Code aleatorio
                if (!user.friend_code) {
                    const parts = Array.from({ length: 3 }, () => 
                        Math.floor(1000 + Math.random() * 9000));
                    user.friend_code = parts.join('-');
                }
            }
        }
    });

    return User;
};