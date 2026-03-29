# NeXo-Server

<div align="center">

**Infraestructura de red completa para el ecosistema NeXo**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify)](https://fastify.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8%2B-4479A1?style=flat-square&logo=mysql)](https://mysql.com)
[![License](https://img.shields.io/badge/License-GPL--2.0-red?style=flat-square)](./LICENSE)

*Reemplazo open source de Nintendo Switch Online — compatible con NeXoEmulator y el protocolo RaptorNetwork*

[nexonetwork.space](https://nexonetwork.space) · [Documentación](./docs) · [API Reference](./docs/api.md)

</div>

---

## ¿Qué es NeXo-Server?

Un único proceso Node.js que sirve **la web pública**, el **portal de usuario** y toda la **API** que el emulador NeXo necesita. Diseñado para aaPanel con Node Project — sin configuraciones complejas.

## Estructura

```
NeXo-Server/
├── src/
│   ├── server.js                    # Entry point
│   ├── db.js                        # Pool MySQL
│   ├── utils.js                     # NexoID, helpers
│   ├── middleware/auth.js            # JWT verify
│   ├── plugins/errorHandler.js      # Errores globales
│   ├── modules/
│   │   ├── accounts/
│   │   │   ├── routes/              # auth, profile, friends, admin, raptor
│   │   │   └── services/accounts.js # Lógica de negocio
│   │   └── games/                   # Módulos por juego (futuro)
│   ├── routes/system.js             # Update Forgejo, status, logs
│   └── web/app.js                   # Web completa (HTML embebido)
├── docs/                            # Documentación
├── scripts/update.sh                # Pull + restart
├── schema.sql
├── package.json
└── .env.example
```

## Setup rápido

```bash
git clone https://github.com/Jous99/NeXo-Server.git
cd NeXo-Server
npm install
cp .env.example .env  # edita con tus credenciales
mysql -u root -p < schema.sql
npm run dev
```

Ver guía completa de despliegue con aaPanel en [`docs/deploy.md`](./docs/deploy.md).

## Módulos

| Módulo | Prefijo | Estado |
|--------|---------|--------|
| accounts | `/auth`, `/profile`, `/friends`, `/admin` | ✅ Estable |
| raptor | `/api/v1/*` (protocolo emulador) | ✅ Estable |
| web | `/` (landing + portal) | ✅ Estable |
| games/matchmaking | `/games/*` | 🚧 Desarrollo |

## Proyectos relacionados

| Proyecto | Repo |
|----------|------|
| NeXo-Emu | [github.com/Jous99/NeXo-Emu](https://github.com/Jous99/NeXo-Emu) |
| RaptorNetwork Backup | [github.com/Jous99/RaptorNetworkBackup](https://github.com/Jous99/RaptorNetworkBackup) |

---

GPL-2.0 · Proyecto educativo · No afiliado con Nintendo
