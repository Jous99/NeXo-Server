# NeXo-Server

<div align="center">

**Infraestructura de red completa para el ecosistema NeXo**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify)](https://fastify.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8%2B-4479A1?style=flat-square&logo=mysql)](https://mysql.com)
[![License](https://img.shields.io/badge/License-GPL--2.0-red?style=flat-square)](./LICENSE)
[![Forgejo](https://img.shields.io/badge/Forgejo-forgejo.joustech.space-orange?style=flat-square)](https://forgejo.joustech.space/NeXo/NeXoNetwork-Server)

*Reemplazo open source de Nintendo Switch Online — compatible con NeXoEmulator y el protocolo RaptorNetwork*

[nexonetwork.space](https://nexonetwork.space) · [Documentación](./docs) · [API Reference](./docs/api.md) · [Forgejo](https://forgejo.joustech.space/NeXo/NeXoNetwork-Server)

</div>

---

## ¿Qué es NeXo-Server?

NeXo-Server es el backend completo del ecosistema NeXo. Funciona como servidor Node.js único que sirve tanto la **web pública** (landing page + portal de usuario) como todos los **módulos de red** que el emulador NeXo necesita para el juego online.

Está diseñado para desplegarse con **aaPanel** usando Node Project, sin necesidad de configuraciones complejas.

```
nexonetwork.space  ──►  NeXo-Server (Fastify)
                            │
                 ┌──────────┼──────────────┐
                 │          │              │
              Web/Portal  Módulo         Módulos
              (público)   Accounts       por juego
                         + RaptorNet    (futuro)
```

---

## Estructura del proyecto

```
NeXo-Server/
│
├── src/                        # Código fuente del servidor
│   ├── server.js               # Entry point — registra todos los módulos
│   ├── db.js                   # Pool MySQL compartido
│   ├── utils.js                # NexoID, tokens, helpers
│   │
│   ├── middleware/
│   │   └── auth.js             # JWT verify hook
│   │
│   ├── plugins/
│   │   └── errorHandler.js     # Error handler global
│   │
│   ├── modules/                # ★ MÓDULOS — cada uno es independiente
│   │   ├── accounts/           # Cuentas, auth, perfiles, amigos
│   │   │   ├── routes/
│   │   │   │   ├── auth.js     # /auth/*
│   │   │   │   ├── profile.js  # /profile/*
│   │   │   │   ├── friends.js  # /friends/*
│   │   │   │   ├── admin.js    # /admin/*
│   │   │   │   └── raptor.js   # /api/v1/* (compatibilidad emulador)
│   │   │   └── services/
│   │   │       └── accounts.js # Toda la lógica de negocio
│   │   │
│   │   └── games/              # Módulos por juego (futuro)
│   │       └── README.md       # Cómo añadir un módulo de juego
│   │
│   └── web/                    # Web pública servida por el mismo proceso
│       ├── public/             # Archivos estáticos (landing, assets)
│       └── admin/              # Panel admin (actualizar servidor, stats)
│
├── docs/                       # Documentación completa
│   ├── api.md                  # Referencia de API
│   ├── deploy.md               # Guía de despliegue (aaPanel)
│   ├── modules.md              # Cómo crear un módulo de juego
│   └── emulator-build.md       # Compilar NeXo-Emu
│
├── scripts/
│   ├── update.sh               # Pull desde Forgejo y reinicia
│   └── setup.sh                # Setup inicial (DB, .env)
│
├── schema.sql                  # Schema MySQL completo
├── package.json
├── .env.example
└── README.md
```

---

## Módulos disponibles

| Módulo | Prefijo | Estado | Descripción |
|--------|---------|--------|-------------|
| **accounts** | `/auth`, `/profile`, `/friends`, `/admin` | ✅ Estable | Cuentas, auth JWT, amigos, presencia, admin |
| **raptor** | `/api/v1/*` | ✅ Estable | Compatibilidad con protocolo RaptorNetwork (emulador) |
| **web** | `/` | ✅ Estable | Landing page + portal de usuario |
| **games/matchmaking** | `/games/*` | 🚧 Desarrollo | Salas de juego y emparejamiento |
| **games/chat** | `/chat/*` | 📋 Planificado | Mensajería entre amigos |

### Cómo funciona la modularidad

Cada módulo vive en `src/modules/<nombre>/` y se registra en `server.js` con un prefijo propio. Añadir un nuevo juego es tan simple como crear la carpeta y registrar las rutas — el resto del servidor no se toca.

---

## Setup rápido

### Requisitos

- Node.js 20 o superior
- MySQL 8+ / MariaDB 11+
- aaPanel con Node Project (para producción)

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/Jous99/NeXo-Server.git
cd NeXo-Server

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
nano .env   # Rellena DB_PASSWORD, JWT_SECRET, etc.

# 4. Crear la base de datos
mysql -u root -p < schema.sql

# 5. Arrancar en desarrollo
npm run dev

# 6. Arrancar en producción (aaPanel lo gestiona)
npm start
```

### Variables de entorno clave

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PASSWORD=tu_contraseña
JWT_SECRET=clave_secreta_larga_minimo_32_chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
FORGEJO_REPO=https://forgejo.joustech.space/NeXo/NeXoNetwork-Server
FORGEJO_TOKEN=tu_token_de_acceso   # Para updates desde el panel admin
```

---

## Despliegue con aaPanel

Ver guía completa en [`docs/deploy.md`](./docs/deploy.md).

Resumen:
1. Crear Node Project apuntando a la carpeta del repo
2. Entry file: `src/server.js`
3. Puerto: `3000` (o el que configures)
4. aaPanel gestiona PM2 automáticamente
5. Añadir dominio y SSL desde aaPanel → Website

El mismo proceso Node sirve tanto la web como la API. No necesitas nginx separado para la app (aaPanel lo configura como proxy reverso automáticamente).

---

## Protocolo RaptorNetwork (emulador)

El módulo `raptor` implementa el protocolo que el cliente C++ de NeXo-Emu espera:

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/v1/server/info` | Info del servidor, MOTD, versión |
| `POST /api/v1/user/authenticate` | Login desde el emulador |
| `POST /api/v1/user/register` | Registro de cuenta |
| `POST /api/v1/user/refresh` | Renovar token |
| `GET /api/v1/user/me` | Perfil del usuario |
| `GET /api/v1/friends` | Lista de amigos con estado online |
| `POST /api/v1/presence` | Actualizar estado en juego |

Ver referencia completa en [`docs/api.md`](./docs/api.md).

---

## NexoID

Cada cuenta tiene un identificador único en formato `NXID-XXXX-XXXX-XXXX`, generado con bytes criptográficamente aleatorios usando un alfabeto sin caracteres ambiguos (sin `0`, `O`, `I`, `1`).

---

## Actualización desde el panel admin

Desde el panel admin de la web puedes hacer `git pull` desde tu repositorio Forgejo y reiniciar el servidor sin acceder por SSH. Ver detalles en [`docs/deploy.md`](./docs/deploy.md).

---

## Proyectos relacionados

| Proyecto | Repo | Descripción |
|----------|------|-------------|
| **NeXo-Emu** | [github.com/Jous99/NeXo-Emu](https://github.com/Jous99/NeXo-Emu) | Emulador Nintendo Switch con red integrada |
| **NeXo-Server** | Este repo | Backend completo (este repo) |
| **RaptorNetwork Backup** | [github.com/Jous99/RaptorNetworkBackup](https://github.com/Jous99/RaptorNetworkBackup) | Cliente original analizado para ingeniería inversa |

---

## Licencia

GPL-2.0. Proyecto educativo y de preservación. No afiliado con Nintendo.

*Desarrollado por [Jous99](https://forgejo.joustech.space/Jous99) — Componente central del ecosistema NeXo.*
