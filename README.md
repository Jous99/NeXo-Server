# NeXo-Server

<div align="center">

**Infraestructura de red completa para el ecosistema NeXo**

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify)
![Go](https://img.shields.io/badge/Go-1.23%2B-00ADD8?style=flat-square&logo=go)
![MySQL](https://img.shields.io/badge/MySQL-8%2B-4479A1?style=flat-square&logo=mysql)
![License](https://img.shields.io/badge/License-GPL--2.0-red?style=flat-square)

*Reemplazo open source de Nintendo Switch Online — para NeXoEmulator (protocolo RaptorCitrus) y Switch moddeada con Atmosphere*

[Documentación](./docs) · [API Reference](./docs/api.md) · [Setup Switch](./docs/switch-setup.md) · [Servidor NEX en Go](./nex-server/README.md)

</div>

---

## Índice

- [¿Qué es NeXo-Server?](#qué-es-nexo-server)
- [Arquitectura](#arquitectura)
- [Estado de servicios Nintendo](#estado-de-servicios-nintendo)
- [Setup rápido](#setup-rápido)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Cómo funciona el routing](#cómo-funciona-el-routing)
- [Conexión de Switch moddeada](#conexión-de-switch-moddeada-resumen)
- [Módulos del servidor](#módulos-del-servidor)
- [Despliegue en producción](#despliegue-en-producción)
- [Proyectos y librerías relacionadas](#proyectos-y-librerías-relacionadas)

---

## ¿Qué es NeXo-Server?

NeXo-Server reimplementa, desde cero y de forma abierta, la infraestructura online de Nintendo Switch: cuentas, amigos, BCAT, y los servidores de juego (NEX) de títulos concretos. No está afiliado con Nintendo — es un proyecto educativo sin ánimo de lucro.

Dos piezas conviven en el repo:

- **Node.js + Fastify 5** — un solo proceso que sirve la web pública, el portal de usuario y toda la API HTTP: auth, perfiles, amigos, BCAT, config del emulador, y los endpoints HTTP de cada juego (subida/descarga de cursos de SMM2, etc.).
- **Go** ([`nex-server/`](./nex-server)) — el protocolo NEX/PRUDP real que hablan las consolas, usando las librerías oficiales de [Pretendo Network](https://github.com/PretendoNetwork) (`nex-go`, `nex-protocols-go`, `nex-protocols-common-go`) en vez de una reimplementación casera. Está reemplazando progresivamente al módulo NEX/TCP escrito a mano que vive dentro de Node — ver [estado exacto](#estado-de-servicios-nintendo) más abajo.

Y dos tipos de cliente se conectan a él:

- **NeXoEmulator** — habla un protocolo propio (RaptorCitrus) sobre WebSocket contra los subdominios de tu dominio. No necesita PRUDP real.
- **Nintendo Switch moddeada** (Atmosphere + archivo hosts) — se conecta directamente a tu servidor en lugar de a Nintendo, y sí necesita el protocolo NEX/PRUDP real (UDP con cifrado Kerberos), que es justo lo que `nex-server/` está implementando correctamente.

---

## Arquitectura

```
                         Internet
                             │
                ┌────────────┴────────────┐
                │                         │
         Nginx (HTTP/HTTPS)          Firewall (UDP directo)
                │                         │
                ▼                         ▼
    ┌───────────────────────┐   ┌─────────────────────┐
    │  Node.js — puerto 3000 │   │  Go — nex-server/    │
    │  (PM2)                 │   │  mk8-auth (PM2)      │
    │                        │   │                      │
    │  Web · Auth · Perfiles │   │  Ticket-granting NEX │
    │  Amigos · BCAT · Config│   │  real (Kerberos) para │
    │  HTTP de cada juego    │   │  Mario Kart 8 Deluxe  │
    │  NEX/TCP casero (legacy│   │                      │
    │  para el emulador)     │   │                      │
    └───────────┬────────────┘   └──────────┬───────────┘
                │                            │
                └─────────────┬──────────────┘
                               ▼
                       MySQL / MariaDB
                    (users: id = PID de NEX,
                     nex_password, etc.)
```

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
| Super Mario Maker 2 | `g9s300c4msl.lp1.s.n.srv.nintendo.net` | 🚧 HTTP + NEX/DataStore vía WebSocket casero — funciona con el **emulador**. Sin auth NEX real (no migrado a Go todavía) |
| Mario Kart 8 Deluxe | `g7sfc1xhmc8.lp1.s.n.srv.nintendo.net` | 🚧 Auth NEX real (Go + Kerberos) lista — ver [nex-server/](./nex-server). SecureConnection/matchmaking siguen en el módulo Node antiguo (TCP, no UDP) |
| Matchmaking genérico | — | 🚧 En desarrollo |
| NPLN completo (gRPC) | `api.lp1.npln.srv.nintendo.net` | 📋 Planificado |

> **Emulador vs. hardware real:** NeXoEmulator no necesita PRUDP real, así que todo lo marcado "✅ (emulador)" ya funciona ahí. Una Switch moddeada sí lo necesita — para eso existe `nex-server/`. Antes de probar contra una consola real, revisa [nex-server/README.md](./nex-server/README.md): hay valores específicos del juego (AccessKey, versión de NEX) que todavía no están confirmados.

---

## Setup rápido

```bash
git clone https://git.joustech.space/NeXo/Nexo-Server.git
cd Nexo-Server
npm install
cp .env.example .env        # edita con tus credenciales
mysql -u root -p < schema.sql
npm run dev
```

Esto levanta el servidor Node completo (web, auth, HTTP de cada juego, y el NEX/TCP casero que ya usa el emulador) en `http://localhost:3000`.

Si además quieres levantar el servidor de auth NEX real en Go — necesario para Mario Kart 8 Deluxe en hardware real, **no** para el emulador:

```bash
cd nex-server
go build -o mk8-auth ./cmd/mk8-auth
./mk8-auth
```

Requiere completar las variables `NEXO_MK8_*` en tu `.env` (ver [.env.example](./.env.example)). Antes de probar contra una Switch real, lee [nex-server/README.md](./nex-server/README.md) — documenta qué valores todavía no están confirmados.

---

## Estructura del proyecto

```
Nexo-Server/
├── src/                                  # Servidor Node.js (Fastify)
│   ├── server.js                        # Entry point y router por subdominio/dominio
│   ├── db.js                            # Pool MySQL
│   ├── utils.js                         # NexoID, tokens, helpers
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
│   │       ├── prudp_core.js            # PRUDP/RMC compartido (WebSocket, emulador)
│   │       ├── smm2/
│   │       │   ├── routes.js            # Super Mario Maker 2 (HTTP API)
│   │       │   ├── nex.js               # Super Mario Maker 2 (NEX/WS, emulador)
│   │       │   └── nex_tcp.js           # Super Mario Maker 2 (NEX/TCP casero)
│   │       └── mk8/
│   │           ├── routes.js            # Mario Kart 8 Deluxe (HTTP API)
│   │           ├── nex.js               # Mario Kart 8 Deluxe (NEX/WS, emulador)
│   │           └── nex_tcp.js           # Mario Kart 8 Deluxe (NEX/TCP casero)
│   ├── routes/
│   │   ├── system.js                    # Update desde Forgejo, status, logs
│   │   └── auth.js / profile.js / friends.js / admin.js  # Portal web
│   └── web/
│       ├── app.js                       # Landing page + portal web (HTML embebido)
│       ├── nexo-emu.html                # Página del emulador
│       └── public/                      # Assets estáticos
│
├── nex-server/                           # Servidor NEX/PRUDP real en Go (Pretendo nex-go)
│   ├── go.mod
│   ├── cmd/mk8-auth/main.go             # Auth NEX real (Kerberos) para MK8D, sobre UDP
│   ├── internal/
│   │   ├── accounts/                    # Cuentas NEX contra la misma MySQL (id = PID, nex_password)
│   │   └── authserver/                  # ValidateAndRequestTicketWithParam (NEX4+/Switch)
│   └── README.md                        # Alcance, qué falta confirmar, cómo verificar
│
├── docs/
│   ├── api.md                           # Referencia de la API
│   ├── deploy.md                        # Guía de despliegue con aaPanel (Node)
│   ├── nex-go-deploy.md                 # Despliegue del proceso Go
│   ├── switch-setup.md                  # Cómo conectar la Switch moddeada
│   ├── modules.md                       # Cómo crear módulos de juego
│   └── emulator-build.md                # Cómo compilar el emulador
│
├── scripts/
│   ├── gen-certs.sh                     # Genera CA + certs SSL para Nintendo y NeXo
│   ├── atmosphere-hosts.txt             # Plantilla hosts para la SD de la Switch
│   ├── update.sh                        # Pull + restart (usado por el panel admin)
│   ├── migrate-nex-password.sql         # Migración: columna nex_password (instalaciones existentes)
│   └── backfill-nex-password.js         # Rellena nex_password en cuentas creadas antes de esta columna
│
├── schema.sql                            # Esquema de la base de datos
├── package.json
└── .env.example
```

---

## Cómo funciona el routing

El servidor Node corre en un solo puerto (3000). Distingue el servicio por el header `Host` de cada petición, usando una tabla de dominios que cubre tanto los subdominios de NeXo como los dominios reales de Nintendo:

```
Host: accounts-api-lp1.nexonetwork.space  → módulo accounts-api  (emulador NeXo)
Host: dauth-lp1.ndas.srv.nintendo.net     → módulo accounts-api  (Switch real vía Atmosphere)
Host: *.baas.nintendo.com                 → módulo accounts-api  (wildcard)
Host: friends.lp1.s.n.srv.nintendo.net    → módulo switch-friends (Switch real)
Host: receive-lp1.er.srv.nintendo.net     → módulo nintendo-stubs (error reporting)
Host: atum.hac.lp1.d4c.nintendo.net       → módulo nintendo-stubs (system updates)
```

El proceso Go (`nex-server/mk8-auth`) es aparte: no usa Host header, escucha en su propio puerto UDP y responde directamente el protocolo PRUDP/NEX binario.

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

Guía completa, con capturas y troubleshooting: [`docs/switch-setup.md`](./docs/switch-setup.md).

Para que un juego funcione de principio a fin en hardware real hace falta además el servidor NEX en Go — ver [nex-server/README.md](./nex-server/README.md) para qué está listo y qué falta.

---

## Módulos del servidor

| Módulo | Prefijo / puerto | Descripción | Estado |
|--------|-------------------|-------------|--------|
| accounts | `/auth`, `/profile`, `/friends`, `/admin` | Portal web y cuentas de usuario | ✅ Estable |
| raptor/accounts-api | `/api/v1/auth/*` + stubs Nintendo | Auth completa: dauth, aauth, BAAS | ✅ Estable |
| raptor/switch-friends | `/v1/users/:pid/*` | API de amigos en formato Nintendo | ✅ Estable |
| raptor/config-api | `/api/v1/rewrites`, `/api/v1/titles` | Rewrites para el emulador | ✅ Estable |
| raptor/notification | `/api/v1/notification` (WebSocket) | Notificaciones push en tiempo real | ✅ Estable |
| raptor/bcat | `/api/v1/bcat/*` | BCAT (contenido de fondo) | ✅ Estable |
| nintendo/stubs | Múltiples rutas Nintendo | Error reporting, updates, eShop stub | ✅ Estable |
| web | `/` (landing + portal) | Web pública y panel de usuario | ✅ Estable |
| games/smm2 | `/v1/courses/*` | Super Mario Maker 2 — HTTP API + NEX/TCP casero | ✅ Estable (emulador) |
| games/mk8d | `/games/mk8d/*` | Mario Kart 8 Deluxe — HTTP API + NEX/TCP casero | ✅ Estable (emulador) |
| games/matchmaking | `/games/rooms/*` | Salas y matchmaking genérico | 🚧 Desarrollo |
| nex-server/mk8-auth | UDP `NEXO_MK8_AUTH_UDP_PORT` | Auth NEX real (Go) para MK8D — reemplaza el ticket hardcodeado del módulo Node | 🚧 Ticket-granting real listo; falta AccessKey/versión NEX confirmados y migrar secure/matchmaking a UDP |

---

## Despliegue en producción

El proceso Node se despliega con aaPanel + PM2 detrás de Nginx: [`docs/deploy.md`](./docs/deploy.md).

El proceso Go es independiente — su propio binario, su propio puerto UDP (que necesita regla de firewall directa, ya que Nginx no proxea UDP), gestionado también con PM2 o systemd: [`docs/nex-go-deploy.md`](./docs/nex-go-deploy.md).

---

## Proyectos y librerías relacionadas

| Proyecto | Repositorio |
|----------|-------------|
| NeXo-Emu | [git.joustech.space/NeXo/NeXo-emu](https://git.joustech.space/NeXo/NeXo-emu) |
| RaptorNetwork Backup | [github.com/Jous99/RaptorNetworkBackup](https://github.com/Jous99/RaptorNetworkBackup) |

Librerías de terceros usadas en `nex-server/` (todas de [Pretendo Network](https://github.com/PretendoNetwork), licencia propia):

| Librería | Uso |
|----------|-----|
| [nex-go](https://github.com/PretendoNetwork/nex-go) | Transporte PRUDP/NEX de bajo nivel (UDP, cifrado Kerberos) |
| [nex-protocols-go](https://github.com/PretendoNetwork/nex-protocols-go) | Definiciones de protocolo RMC (Ticket Granting, DataStore, etc.) |
| [nex-protocols-common-go](https://github.com/PretendoNetwork/nex-protocols-common-go) | Handlers ya hechos para protocolos comunes |

---

<div align="center">

GPL-2.0 · Proyecto educativo sin ánimo de lucro · No afiliado con Nintendo

</div>
