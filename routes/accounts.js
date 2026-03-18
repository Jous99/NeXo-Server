const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AccountService {
    // Registro de usuario
    async registerUser({ username, email, password, nickname }) {
        const hash = await bcrypt.hash(password, 10);
        const nexoId = `NX-${Math.floor(1000+Math.random()*9000)}-${Math.floor(1000+Math.random()*9000)}`;
        await db.execute(
            'INSERT INTO users (username, email, password_hash, nexo_id, nickname) VALUES (?,?,?,?,?)',
            [username, email, hash, nexoId, nickname]
        );
        return { nexoId };
    }

    // Login de usuario
    async authenticate(username, password) {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) throw new Error('Usuario no encontrado');

        const isMatch = await bcrypt.compare(password, users[0].password_hash);
        if (!isMatch) throw new Error('Contraseña incorrecta');

        const user = users[0];
        const token = jwt.sign({ id: user.id, nexo_id: user.nexo_id }, 'nexo_secret_001', { expiresIn: '24h' });
        
        return { token, nickname: user.nickname, nexo_id: user.nexo_id };
    }

    // OBTENER PERFIL (Lo que faltaba)
    async getProfile(nexoId) {
        const [users] = await db.execute(
            'SELECT nickname, nexo_id, username, created_at FROM users WHERE nexo_id = ?', 
            [nexoId]
        );
        return users.length > 0 ? users[0] : null;
    }
}

module.exports = new AccountService();