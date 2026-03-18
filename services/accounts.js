const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Clave secreta para firmar tokens. 
// Se intenta leer del .env, si no existe, usa la de respaldo para evitar errores.
const JWT_SECRET = process.env.JWT_SECRET || 'nexo_network_secret_key_2026_safe';

class AccountService {
    
    // Función para registrar un nuevo usuario
    async registerUser({ username, email, password, nickname }) {
        if (!username || !password || !nickname) {
            throw new Error('Todos los campos son obligatorios');
        }

        const hash = await bcrypt.hash(password, 10);
        
        // Genera un Nexo ID aleatorio (Ej: NX-4521-8892)
        const nexoId = `NX-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
            await db.execute(
                'INSERT INTO users (username, email, password_hash, nexo_id, nickname) VALUES (?, ?, ?, ?, ?)',
                [username, email, hash, nexoId, nickname]
            );
            return { nexoId };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('El nombre de usuario o email ya están registrados');
            }
            throw error;
        }
    }

    // Función para iniciar sesión
    async authenticate(username, password) {
        // Buscamos al usuario por nombre de usuario o por su Nexo ID
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ? OR nexo_id = ?', 
            [username, username]
        );
        
        if (users.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        const user = users[0];

        // Validamos la contraseña
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Contraseña incorrecta');
        }

        // Creamos el Token de sesión
        const token = jwt.sign(
            { id: user.id, nexo_id: user.nexo_id }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Retornamos los datos necesarios para el frontend
        return {
            token,
            nexo_id: user.nexo_id,
            nickname: user.nickname,
            username: user.username
        };
    }

    // Función para obtener los datos de un perfil público
    async getProfile(nexoId) {
        if (!nexoId) throw new Error('Se requiere un Nexo ID');

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