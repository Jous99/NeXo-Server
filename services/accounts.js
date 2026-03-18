const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nexo_fixed_key_2026_safe';

class AccountService {
    // LOGIN
    async authenticate(username, password) {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ? OR nexo_id = ?', [username, username]);
        if (users.length === 0) throw new Error('Usuario no encontrado');
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) throw new Error('Contraseña incorrecta');
        const token = jwt.sign({ nexo_id: user.nexo_id }, JWT_SECRET, { expiresIn: '24h' });
        return { token, nexo_id: user.nexo_id, nickname: user.nickname };
    }

    // OBTENER PERFIL
    async getProfile(nexoId) {
        const [users] = await db.execute('SELECT nickname, nexo_id, avatar_url, created_at FROM users WHERE nexo_id = ?', [nexoId]);
        return users.length > 0 ? users[0] : null;
    }

    // ACTUALIZAR PERFIL (CORREGIDO)
    async updateProfile(nexoId, data) {
        const { nickname, avatar_url, currentPassword, newPassword } = data;

        // 1. Actualizar apodo y foto si vienen en el request
        if (avatar_url) {
            await db.execute('UPDATE users SET nickname = ?, avatar_url = ? WHERE nexo_id = ?', [nickname, avatar_url, nexoId]);
        } else {
            await db.execute('UPDATE users SET nickname = ? WHERE nexo_id = ?', [nickname, nexoId]);
        }

        // 2. Cambio de contraseña (opcional)
        if (currentPassword && newPassword) {
            const [users] = await db.execute('SELECT password_hash FROM users WHERE nexo_id = ?', [nexoId]);
            const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
            if (!isMatch) throw new Error('La contraseña actual es incorrecta');

            const newHash = await bcrypt.hash(newPassword, 10);
            await db.execute('UPDATE users SET password_hash = ? WHERE nexo_id = ?', [newHash, nexoId]);
        }

        return { success: true };
    }
}

module.exports = new AccountService();