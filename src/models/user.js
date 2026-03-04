module.exports = (sequelize, DataTypes) => {
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
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        uuid: {
            type: DataTypes.STRING,
            unique: true,
            defaultValue: DataTypes.UUIDV4
        }
    }, {
        tableName: 'users', // Forzamos minúsculas
        timestamps: true
    });

    return User;
};