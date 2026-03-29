# API Reference — NeXo-Server

Base URL: `https://nexonetwork.space`

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <access_token>
```

Los access tokens expiran en **15 minutos**. Usa el refresh token para renovarlos.

---

## Módulo: Accounts

### Auth

| Método | Endpoint | Auth | Body | Descripción |
|--------|----------|------|------|-------------|
| `POST` | `/auth/register` | — | `username, email, password, [nickname]` | Crear cuenta |
| `POST` | `/auth/login` | — | `login, password` | Login — devuelve access + refresh token |
| `POST` | `/auth/refresh` | — | `refresh_token` | Renovar access token |
| `POST` | `/auth/logout` | JWT | `[refresh_token]` | Cerrar sesión actual |
| `POST` | `/auth/logout-all` | JWT | — | Cerrar todas las sesiones |

**POST /auth/login — respuesta:**
```json
{
  "ok": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "abc123...64chars",
    "nexo_id": "NXID-ABCD-EFGH-IJKL",
    "nickname": "Jugador"
  }
}
```

### Perfil

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/profile/me` | JWT | Mi perfil completo + presencia |
| `GET` | `/profile/:nexo_id` | JWT | Perfil público de otro usuario |
| `PATCH` | `/profile/me` | JWT | Actualizar nickname, avatar, lang, region |
| `POST` | `/profile/me/change-password` | JWT | Cambiar contraseña (revoca todas las sesiones) |
| `PUT` | `/profile/me/presence` | JWT | Actualizar estado online/in_game/offline |

### Amigos

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/friends` | JWT | Lista amigos + solicitudes pendientes |
| `POST` | `/friends/request` | JWT | `{ nexo_id }` — enviar solicitud |
| `PUT` | `/friends/:nexo_id/respond` | JWT | `{ accept: true/false }` |
| `DELETE` | `/friends/:nexo_id` | JWT | Eliminar amigo |
| `POST` | `/friends/:nexo_id/block` | JWT | Bloquear usuario |

### Admin (requiere is_admin = true)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/admin/users` | JWT+Admin | Listar todos los usuarios (paginado) |
| `GET` | `/admin/users/:nexo_id` | JWT+Admin | Detalle de un usuario |
| `POST` | `/admin/users/:nexo_id/ban` | JWT+Admin | `{ reason }` — banear usuario |
| `POST` | `/admin/users/:nexo_id/unban` | JWT+Admin | Desbanear usuario |
| `POST` | `/admin/users/:nexo_id/promote` | JWT+Admin | Hacer admin |
| `DELETE` | `/admin/users/:nexo_id` | JWT+Admin | Eliminar cuenta |
| `GET` | `/admin/stats` | JWT+Admin | Estadísticas globales |
| `POST` | `/admin/system/update` | JWT+Admin | Pull desde Forgejo y reinicia |

---

## Módulo: RaptorNetwork (protocolo emulador)

Estos endpoints usan el formato de respuesta `{ result: "Success", ... }` que espera el cliente C++.

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/v1/server/info` | — | Info, versión y MOTD del servidor |
| `POST` | `/api/v1/user/authenticate` | — | Login desde el emulador |
| `POST` | `/api/v1/user/register` | — | Registro de cuenta |
| `POST` | `/api/v1/user/refresh` | — | Renovar token |
| `GET` | `/api/v1/user/me` | JWT | Perfil del usuario |
| `GET` | `/api/v1/friends` | JWT | Lista de amigos con estado |
| `POST` | `/api/v1/presence` | JWT | Actualizar estado en juego |
| `POST` | `/api/v1/friends/request` | JWT | `{ target_id }` — solicitud de amistad |
| `POST` | `/api/v1/user/logout` | JWT | Cerrar sesión del emulador |

**GET /api/v1/server/info — respuesta:**
```json
{
  "result": "Success",
  "name": "NeXoNetwork",
  "version": "1.0.0",
  "protocol": 1,
  "motd": "Welcome to NeXoNetwork",
  "maintenance": false
}
```

**POST /api/v1/user/authenticate — body:**
```json
{
  "username": "mi_usuario",
  "password": "mi_contraseña",
  "client_ver": "1.0.0",
  "platform": "NX"
}
```

---

## Sistema

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Health check — `{ ok: true, service: "nexo-server" }` |

---

## Códigos de error

| Código HTTP | Descripción |
|-------------|-------------|
| `400` | Bad Request — parámetros inválidos |
| `401` | Unauthorized — token inválido o expirado |
| `403` | Forbidden — sin permisos (baneado o no admin) |
| `404` | Not Found — recurso no encontrado |
| `409` | Conflict — recurso ya existe (usuario duplicado, amistad ya existe) |
| `500` | Internal Server Error |

**Formato de error:**
```json
{
  "ok": false,
  "error": "Descripción del error"
}
```
