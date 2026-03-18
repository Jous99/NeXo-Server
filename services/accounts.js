const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Clave secreta blindada para evitar el error de tus fotos
const JWT_SECRET = process.env.JWT_SECRET || 'nexo_master_key_2026_fixed';

class AccountService {
    // Autenticación
    async authenticate(username, password) {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ? OR nexo_id = ?', [username, username]);
        if (users.length === 0) throw new Error('Usuario no encontrado');

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) throw new Error('Contraseña incorrecta');

        const token = jwt.sign({ nexo_id: user.nexo_id }, JWT_SECRET, { expiresIn: '24h' });
        return { token, nexo_id: user.nexo_id, nickname: user.nickname };
    }

    // Obtener datos
    async getProfile(nexoId) {
        const [users] = await db.execute('SELECT nickname, nexo_id, created_at FROM users WHERE nexo_id = ?', [nexoId]);
        return users.length > 0 ? users[0] : null;
    }

    // Editar Perfil (Actualizar apodo)
    async updateProfile(nexoId, { nickname }) {
        if (!nickname || nickname.trim() === "") throw new Error('El apodo no puede estar vacío');
        await db.execute('UPDATE users SET nickname = ? WHERE nexo_id = ?', [nickname, nexoId]);
        return { nickname };
    }
}

module.exports = new AccountService();