# NeXo-Server

<div align="center">

**Infraestructura de red completa para el ecosistema NeXo**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify)](https://fastify.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8%2B-4479A1?style=flat-square&logo=mysql)](https://mysql.com)
[![License](https://img.shields.io/badge/License-GPL--2.0-red?style=flat-square)](./LICENSE)

*Reemplazo open source de Nintendo Switch Online — compatible con NeXoEmulator, Switch moddeada con Atmosphere, y el protocolo RaptorCitrus*

[nexonetwork.space](https://nexonetwork.space) · [Documentación](./docs) · [API Reference](./docs/api.md) · [Setup Switch](./docs/switch-setup.md)

</div>

---

## ¿Qué es NeXo-Server?

Un proceso único en **Node.js + Fastify 5** que reemplaza todos los servicios de Nintendo Switch Online. Sirve la web pública, el portal de usuario y toda la API del ecosistema NeXo desde un solo servidor.

Funciona con dos tipos de clientes:
- **NeXoEmulator** — el emulador conecta vía protocolo RaptorCitrus a los subdominios de `nexonetwork.space`
- **Nintendo Switch moddeada** — con Atmosphere + archivo hosts, la Switch se conecta directamente a tu servidor en lugar de a Nintendo

---

## Estado de servicios Nintendo

| Servicio | Dominio Nintendo original | Estado |
|---|---|---|
| Device auth (dauth) | `dauth-lp1.ndas.srv.nintendo.net` | ✅ Implementado |
| App auth (aauth) | `aauth-lp1.ndas.srv.nintendo.net` | ✅ Implementado |
| Cuentas Nintendo | `accounts.nintendo.com` | ✅ Implementado |
| BAAS (login por juego) | `*.baas.nintendo.com` | ✅ Implementado |
| Lista de amigos | `friends.lp1.s.n.srv.nintendo.net` | ✅ Implementado |
| BCAT (contenido de fondo) | `bcat-list/dl-lp1.cdn.nintendo.net` | ✅ Implementado |
| Captive portal / NIFM | `ctest.cdn.nintendo.net` | ✅ Implementado |
| Error reporting | `receive-lp1.er.srv.nintendo.net` | ✅ Stub (acepta y descarta) |
| System updates | `atum.hac.lp1.d4c.nintendo.net` | ✅ Stub (sin actualizaciones) |
| Title version list | `tagaya.hac.lp1.eshop.nintendo.net` | ✅ Stub |
| eShop básico | `shogun-lp1.eshop.nintendo.net` | ✅ Stub |
| Super Mario Maker 2 | `g9s300c4msl.lp1.s.n.srv.nintendo.net` | ✅ Implementado (HTTP + NEX/DataStore) |
| Matchmaking genérico | — | 🚧 En desarrollo |
| Mario Kart 8 Deluxe | `g7sfc1xhmc8.lp1.s.n.srv.nintendo.net` | ✅ Implementado (HTTP + NEX/MatchmakeExtension) |
| NPLN completo (gRPC) | `api.lp1.npln.srv.nintendo.net` | 📋 Planificado |

---

## Estructura del proyecto

```
NeXo-Server/
├── src/
│   ├── server.js                        # Entry point y router por subdominio/dominio
│   ├── db.js                            # Pool MySQL
│   ├── utils.js                         # NexoID, helpers
│   ├── middleware/auth.js               # Verificación JWT
│   ├── plugins/errorHandler.js          # Manejo de errores global
│   ├── modules/
│   │   ├── accounts/
│   │   │   ├── routes/                  # auth, profile, friends, admin, raptor
│   │   │   └── services/accounts.js     # Lógica de negocio de cuentas
│   │   ├── raptor/
│   │   │   ├── accounts-api.js          # Auth chain: dauth, aauth, BAAS, accounts.nintendo.com
│   │   │   ├── profile-api.js           # Perfiles de usuario
│   │   │   ├── friends-api.js           # Lista de amigos (protocolo NeXo)
│   │   │   ├── switch-friends-api.js    # Lista de amigos (protocolo Nintendo real)
│   │   │   ├── config-api.js            # Rewrites de dominios para el emulador
│   │   │   ├── bcat-api.js              # BCAT (contenido de fondo)
│   │   │   ├── status-api.js            # Estado del servidor
│   │   │   ├── notification-api.js      # Notificaciones WebSocket
│   │   │   └── connector-api.js         # Captive portal + STUN/TURN (futuro)
│   │   ├── nintendo/
│   │   │   └── stubs.js                 # Stubs de servicios Nintendo (error reporting, updates, eShop)
│   │   └── games/
│   │       ├── README.md                # Cómo crear un módulo de juego
│   │       ├── smm2/
│   │       │   ├── routes.js            # Super Mario Maker 2 (HTTP API)
│   │       │   └── nex.js               # Super Mario Maker 2 (NEX/PRUDP + DataStore)
│   │       └── mk8/
│   │           ├── routes.js            # Mario Kart 8 Deluxe (HTTP API)
│   │           └── nex.js               # Mario Kart 8 Deluxe (NEX/PRUDP matchmaking)
│   ├── routes/
│   │   ├── system.js                    # Update desde Forgejo, status, logs
│   │   ├── auth.js / profile.js / friends.js / admin.js  # Portal web
│   └── web/
│       ├── app.js                       # Landing page + portal web (HTML embebido)
│       ├── nexo-emu.html                # Página del emulador
│       └── public/                      # Assets estáticos
├── docs/
│   ├── api.md                           # Referencia de la API
│   ├── deploy.md                        # Guía de despliegue con aaPanel
│   ├── switch-setup.md                  # Cómo conectar la Switch moddeada
│   ├── modules.md                       # Cómo crear módulos de juego
│   └── emulator-build.md               # Cómo compilar el emulador
├── scripts/
│   ├── gen-certs.sh                     # Genera CA + certs SSL para Nintendo y NeXo
│   ├── atmosphere-hosts.txt             # Plantilla hosts para la SD de la Switch
│   └── update.sh                        # Pull + restart (usado por el panel admin)
├── schema.sql                           # Esquema de la base de datos
├── package.json
└── .env.example
```

---

## Cómo funciona el routing

El servidor corre en un solo puerto (3000). Distingue el servicio por el header `Host` de cada petición, usando una tabla de dominios que cubre tanto los subdominios de NeXo como los dominios reales de Nintendo:

```
Host: accounts-api-lp1.nexonetwork.space  → módulo accounts-api  (emulador NeXo)
Host: dauth-lp1.ndas.srv.nintendo.net     → módulo accounts-api  (Switch real vía Atmosphere)
Host: *.baas.nintendo.com                 → módulo accounts-api  (wildcard)
Host: friends.lp1.s.n.srv.nintendo.net   → módulo switch-friends (Switch real)
Host: receive-lp1.er.srv.nintendo.net    → módulo nintendo-stubs (error reporting)
Host: atum.hac.lp1.d4c.nintendo.net      → módulo nintendo-stubs (system updates)
```

---

## Setup rápido

```bash
git clone https://github.com/Jous99/NeXo-Server.git
cd NeXo-Server
npm install
cp .env.example .env        # edita con tus credenciales
mysql -u root -p < schema.sql
npm run dev
```

Para despliegue en producción con aaPanel: [`docs/deploy.md`](./docs/deploy.md)

Para conectar tu Switch moddeada: [`docs/switch-setup.md`](./docs/switch-setup.md)

---

## Conexión de Switch moddeada (resumen)

```bash
# 1. Generar certificados SSL (CA + certs para dominios Nintendo)
./scripts/gen-certs.sh

# 2. Activar HTTPS
echo "NEXO_HTTPS=true" >> .env

# 3. Copiar hosts a la SD de la Switch
#    Editar scripts/atmosphere-hosts.txt → reemplazar TU_IP_AQUI
#    Copiar a: SD:/atmosphere/hosts/default.txt

# 4. Instalar la CA en la Switch
#    Copiar certs/nexo-ca.crt → instalar con NX-CA-Installer homebrew

# 5. Reiniciar la Switch con Atmosphere
```

---

## Módulos del servidor

| Módulo | Prefijo | Descripción | Estado |
|--------|---------|-------------|--------|
| accounts | `/auth`, `/profile`, `/friends`, `/admin` | Portal web y cuentas de usuario | ✅ Estable |
| raptor/accounts-api | `/api/v1/auth/*` + stubs Nintendo | Auth completa: dauth, aauth, BAAS | ✅ Estable |
| raptor/switch-friends | `/v1/users/:pid/*` | API de amigos en formato Nintendo | ✅ Estable |
| raptor/config-api | `/api/v1/rewrites`, `/api/v1/titles` | Rewrites para el emulador | ✅ Estable |
| raptor/notification | `/api/v1/notification` (WebSocket) | Notificaciones push en tiempo real | ✅ Estable |
| raptor/bcat | `/api/v1/bcat/*` | BCAT (contenido de fondo) | ✅ Estable |
| nintendo/stubs | Múltiples rutas Nintendo | Error reporting, updates, eShop stub | ✅ Estable |
| web | `/` (landing + portal) | Web pública y panel de usuario | ✅ Estable |
| games/smm2 | `/v1/courses/*` | Super Mario Maker 2 (HTTP API + NEX) | ✅ Estable |
| games/matchmaking | `/games/rooms/*` | Salas y matchmaking genérico | 🚧 Desarrollo |
| games/mk8d | `/games/mk8d/*` | Mario Kart 8 Deluxe (HTTP API + NEX) | ✅ Estable |

---

## Proyectos relacionados

| Proyecto | Repositorio |
|----------|-------------|
| NeXo-Emu | [github.com/Jous99/NeXo-Emu](https://github.com/Jous99/NeXo-Emu) |
| RaptorNetwork Backup | [github.com/Jous99/RaptorNetworkBackup](https://github.com/Jous99/RaptorNetworkBackup) |

---

GPL-2.0 · Proyecto educativo sin ánimo de lucro · No afiliado con Nintendo | Powered by Claude
