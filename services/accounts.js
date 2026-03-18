const db = require('../db'); // Tu archivo de conexión que lee el .env
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AccountService {
    
    // 1. Generar un Nexo ID único (Formato Switch: NX-XXXX-XXXX)
    generateNexoId() {
        const part1 = Math.floor(1000 + Math.random() * 9000);
        const part2 = Math.floor(1000 + Math.random() * 9000);
        return `NX-${part1}-${part2}`;
    }

    // 2. Registrar un nuevo usuario
    async registerUser(userData) {
        const { username, email, password, nickname } = userData;
        
        // Encriptar contraseña (10 rondas de sal)
        const hashedPassword = await bcrypt.hash(password, 10);
        const nexoId = this.generateNexoId();

        const query = `
            INSERT INTO users (username, email, password_hash, nexo_id, nickname, online_status) 
            VALUES (?, ?, ?, ?, ?, 'offline')
        `;
        
        try {
            const [result] = await db.execute(query, [username, email, hashedPassword, nexoId, nickname]);
            return { id: result.insertId, nexoId };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('El usuario o email ya existe en NeXo.');
            }
            throw error;
        }
    }

    // 3. Autenticar Usuario (Login)
    async authenticate(username, password) {
        const query = 'SELECT * FROM users WHERE username = ? OR email = ?';
        const [users] = await db.execute(query, [username, username]);

        if (users.length === 0) throw new Error('Usuario no encontrado.');

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) throw new Error('Credenciales inválidas.');

        // Actualizar estado a ONLINE y última conexión
        await db.execute(
            'UPDATE users SET online_status = "online", last_seen = NOW() WHERE id = ?',
            [user.id]
        );

        // Crear Token JWT usando el secret de tu .env
        const token = jwt.sign(
            { id: user.id, nexo_id: user.nexo_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                nickname: user.nickname,
                nexo_id: user.nexo_id,
                avatar: user.avatar_url,
                role: user.role
            }
        };
    }

    // 4. Obtener perfil por Nexo ID (Para la búsqueda de amigos)
    async getProfile(nexoId) {
        const [users] = await db.execute(
            'SELECT nickname, avatar_url, online_status, last_seen, bio FROM users WHERE nexo_id = ?',
            [nexoId]
        );
        return users[0] || null;
    }
}

module.exports = new AccountService();