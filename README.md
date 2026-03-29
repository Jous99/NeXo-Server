# NeXoNetwork — Accounts Core

> Core de cuentas para NeXoNetwork, el reemplazo de Nintendo Switch Online.

---

## Stack

| Capa        | Tecnología                    |
|-------------|-------------------------------|
| Runtime     | Node.js 20+                   |
| Framework   | Fastify 5                     |
| Base de datos | MySQL 8 / MariaDB 11        |
| Auth        | JWT (access) + Refresh Token  |
| Passwords   | bcryptjs (12 rounds)          |

---

## Estructura

```
src/
├── server.js               # Entry point
├── db.js                   # MySQL pool
├── utils.js                # NexoID generator, crypto helpers
├── middleware/
│   └── auth.js             # JWT verify hook
├── plugins/
│   └── errorHandler.js     # Global error handler
├── routes/
│   ├── auth.js             # /auth/*
│   ├── profile.js          # /profile/*
│   └── friends.js          # /friends/*
└── services/
    └── accounts.js         # Business logic
```

---

## Setup

```bash
cp .env.example .env
# edita .env con tus credenciales

npm install
mysql -u root -p < schema.sql
npm run dev
```

---

## API Reference

### Auth

| Method | Endpoint            | Body                              | Auth | Descripción              |
|--------|---------------------|-----------------------------------|------|--------------------------|
| POST   | `/auth/register`    | `username, email, password`       | —    | Registrar cuenta         |
| POST   | `/auth/login`       | `login, password`                 | —    | Login                    |
| POST   | `/auth/refresh`     | `refresh_token`                   | —    | Renovar access token     |
| POST   | `/auth/logout`      | `refresh_token?`                  | JWT  | Cerrar sesión            |
| POST   | `/auth/logout-all`  | —                                 | JWT  | Cerrar todas las sesiones|

### Profile

| Method | Endpoint                       | Auth | Descripción                 |
|--------|--------------------------------|------|-----------------------------|
| GET    | `/profile/me`                  | JWT  | Mi perfil completo          |
| GET    | `/profile/:nexo_id`            | JWT  | Perfil público de otro user |
| PATCH  | `/profile/me`                  | JWT  | Actualizar perfil           |
| POST   | `/profile/me/change-password`  | JWT  | Cambiar contraseña          |
| PUT    | `/profile/me/presence`         | JWT  | Actualizar estado online    |

### Friends

| Method | Endpoint                     | Auth | Descripción              |
|--------|------------------------------|------|--------------------------|
| GET    | `/friends`                   | JWT  | Lista de amigos          |
| POST   | `/friends/request`           | JWT  | Enviar solicitud         |
| PUT    | `/friends/:nexo_id/respond`  | JWT  | Aceptar / rechazar       |
| DELETE | `/friends/:nexo_id`          | JWT  | Eliminar amigo           |
| POST   | `/friends/:nexo_id/block`    | JWT  | Bloquear usuario         |

---

## NexoID

Formato: `NXID-XXXX-XXXX-XXXX`  
Generado con bytes criptográficamente aleatorios, sin caracteres ambiguos (0, O, I, 1).

## Tokens

- **Access Token**: JWT firmado, expira en `15m` (configurable).
- **Refresh Token**: 32 bytes aleatorios (hex 64 chars). Se guarda como SHA-256 en DB.  
  El cliente lo envía para renovar el access token sin re-autenticarse.
- Al cambiar contraseña se revocan **todas** las sesiones automáticamente.
