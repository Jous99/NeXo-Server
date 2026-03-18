const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// SOLUCIÓN DEFINITIVA: Si el .env no carga, usa esta clave maestra
const JWT_SECRET = process.env.JWT_SECRET || 'NexoNetwork_Master_Key_2026_Secure';

class AccountService {
    
    async registerUser({ username, email, password, nickname }) {
        if (!username || !password || !nickname) throw new Error('Faltan datos requeridos');
        
        const hash = await bcrypt.hash(password, 10);
        const nexoId = `NX-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const query = 'INSERT INTO users (username, email, password_hash, nexo_id, nickname) VALUES (?, ?, ?, ?, ?)';
        await db.execute(query, [username, email, hash, nexoId, nickname]);
        
        return { nexo_id: nexoId, nickname };
    }

    async authenticate(username, password) {
        if (!username || !password) throw new Error('Usuario y contraseña requeridos');

        const [users] = await db.execute('SELECT * FROM users WHERE username = ? OR nexo_id = ?', [username, username]);
        if (users.length === 0) throw new Error('El usuario no existe');

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw new Error('La contraseña es incorrecta');

        // Generar Token con la clave asegurada
        const token = jwt.sign(
            { id: user.id, nexo_id: user.nexo_id }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        return {
            token,
            nexo_id: user.nexo_id,
            nickname: user.nickname
        };
    }

    async getProfile(nexoId) {
        const query = 'SELECT nickname, nexo_id, created_at FROM users WHERE nexo_id = ?';
        const [users] = await db.execute(query, [nexoId]);
        return users.length > 0 ? users[0] : null;
    }
}

module.exports = new AccountService();