async updateProfile(nexoId, data) {
    const { nickname, avatar_url, currentPassword, newPassword } = data;

    // Actualizar nombre y foto (si hay una nueva)
    if (avatar_url) {
        await db.execute('UPDATE users SET nickname = ?, avatar_url = ? WHERE nexo_id = ?', [nickname, avatar_url, nexoId]);
    } else {
        await db.execute('UPDATE users SET nickname = ? WHERE nexo_id = ?', [nickname, nexoId]);
    }

    // Lógica de contraseña (la misma de antes...)
    if (currentPassword && newPassword) {
        // ... (verificación bcrypt y update)
    }
    return { success: true };
}