const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Usamos la clave del .env, y si no existe, una de respaldo para que no explote
const JWT_SECRET = process.env.JWT_SECRET || 'nexo_network_ultra_secret_key_2026';

class AccountService {
    
    // 1. REGISTRO DE USUARIO
    async registerUser({ username, email, password, nickname }) {
        if (!username || !password || !nickname) {
            throw new Error('Faltan campos obligatorios');
        }

        const hash = await bcrypt.hash(password, 10);
        
        // Generar un Nexo ID estilo Switch (NX-XXXX-XXXX)
        const nexoId = `NX-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
            await db.execute(
                'INSERT INTO users (username, email, password_hash, nexo_id, nickname) VALUES (?, ?, ?, ?, ?)',
                [username, email, hash, nexoId, nickname]
            );
            return { nexoId };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('El usuario o email ya existe');
            }
            throw error;
        }
    }

    // 2. AUTENTICACIÓN (LOGIN) - AQUÍ ESTABA EL ERROR
    async authenticate(username, password) {
        // Buscar usuario
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        const user = users[0];

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Contraseña incorrecta');
        }

        // GENERAR TOKEN (Corregido para que nunca sea undefined)
        const token = jwt.sign(
            { id: user.id, nexo_id: user.nexo_id }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Devolvemos los datos que el frontend necesita guardar
        return {
            token,
            nexo_id: user.nexo_id,
            nickname: user.nickname,
            username: user.username
        };
    }

    // 3. OBTENER PERFIL
    async getProfile(nexoId) {
        if (!nexoId) throw new Error('Nexo ID es requerido');

        const [users] = await db.execute(
            'SELECT nickname, nexo_id, username, created_at FROM users WHERE nexo_id = ?', 
            [nexoId]
        );

        if (users.length === 0) return null;

        return {
            nickname: users[0].nickname,
            nexo_id: users[0].nexo_id,
            username: users[0].username,
            created_at: users[0].created_at
        };
    }
}

module.exports = new AccountService();