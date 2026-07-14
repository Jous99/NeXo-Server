# nex-server — Servidor de auth NEX real (Go)

Módulo Go independiente (no interfiere con `npm`/`package.json`) que reemplaza,
para Mario Kart 8 Deluxe, el ticket de autenticación NEX hardcodeado con clave
cero que servía antes `src/modules/games/mk8/nex_tcp.js`. Usa las librerías
reales de Pretendo Network: [nex-go/v2](https://github.com/PretendoNetwork/nex-go),
[nex-protocols-go/v2](https://github.com/PretendoNetwork/nex-protocols-go) y
[nex-protocols-common-go/v2](https://github.com/PretendoNetwork/nex-protocols-common-go).

## Alcance (fase 1)

Solo el protocolo **Ticket Granting / Authentication** (proto 10) de MK8D,
sobre **UDP real** — no WebSocket. El resto de MK8D (SecureConnection,
MatchmakeExtension) sigue en Node (`mk8/nex_tcp.js`). SMM2 no se toca.

**Caveat de transporte importante:** el ticket que emite este servidor apunta
(`SecureStationURL`) al `mk8/nex_tcp.js` de Node existente, que es **TCP**, no
UDP. Una Switch real habla PRUDP sobre UDP a nivel de sistema operativo — no
tiene forma de "conectar por TCP" a ese siguiente salto. Esto significa que,
aunque el ticket que emite este servidor es completamente real y válido
(Kerberos real, cuenta real de la base de datos), **una sesión completa de
MK8D online no funcionará hasta que el servidor "secure" también hable UDP
real** (fase posterior, fuera de alcance de este cambio). Lo que sí puedes
verificar ya en esta fase: que el handshake PRUDP y la emisión del ticket
funcionan correctamente contra cuentas reales (ver "Verificación" abajo).

## Valores SIN CONFIRMAR — necesarios antes de probar contra hardware real

Estos son constantes específicas de Mario Kart 8 Deluxe (Switch), extraídas
normalmente por ingeniería inversa del binario del juego. No las encontré en
fuentes públicas durante la investigación (los repos públicos de Pretendo son
de Mario Kart 7/8 de **Wii U/3DS**, título distinto con AccessKey distinto):

| Variable | Qué es | Dónde buscarlo |
|---|---|---|
| `NEXO_MK8_ACCESS_KEY` | Firma los paquetes PRUDP | Strings del binario de MK8D, o bases de datos de la comunidad NEX (Kinnay, etc.) |
| `NEXO_MK8_NEX_VERSION` | Versión de librería NEX que negocia el juego | Idem — el valor por defecto (4.0.0) es una suposición razonable (títulos Switch usan NEX 4+) pero no confirmada |
| Puerto UDP real que MK8D intenta contactar | El juego lo trae hardcodeado en el binario | Idem — `NEXO_MK8_AUTH_UDP_PORT` es configurable, pon aquí el valor real una vez lo sepas |

El servidor **no arranca** sin `NEXO_MK8_ACCESS_KEY` y `NEXO_MK8_SECURE_PASSWORD`
configurados (falla rápido con un mensaje claro), para no dar una falsa
sensación de que "ya funciona" con datos de relleno.

## Build

```bash
cd nex-server
go build -o mk8-auth ./cmd/mk8-auth
```

Requiere Go 1.23+.

## Configuración

Lee el mismo `.env` que Node, un nivel arriba (`../.env`) — variables nuevas
documentadas en [.env.example](../.env.example), sección "NEX Go — Auth
server". Reutiliza `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` y
`NEXO_TCP_HOST`/`NEXO_MK8_TCP_PORT` ya existentes.

## Ejecutar

```bash
./mk8-auth
```

Escucha UDP en `NEXO_MK8_AUTH_UDP_PORT` (default 60000).

## Verificación local (sin hardware)

1. `go build ./...` y `go vet ./...` deben pasar sin errores.
2. Con una cuenta creada vía `/auth/register` de Node (que ya tiene
   `nex_password` relleno — ver `src/modules/accounts/services/accounts.js`),
   ejercita el handshake PRUDP (SYN → CONNECT → DATA con
   `TicketGranting::ValidateAndRequestTicketWithParam`, proto 10 método 6)
   contra `127.0.0.1:$NEXO_MK8_AUTH_UDP_PORT` y confirma que el `SourcePID`
   devuelto coincide con el `id` real de la cuenta en `users` (no un valor
   hardcodeado). El PID de NEX es directamente `users.id`, sin columna espejo.

## Estructura

```
nex-server/
├── go.mod
├── cmd/mk8-auth/main.go       — arranca el PRUDPServer y registra el protocolo
└── internal/
    ├── accounts/store.go      — AccountDetailsByPID/ByUsername contra MySQL
    └── authserver/ticket.go   — handler NEX4+ ValidateAndRequestTicketWithParam
                                  (nex-protocols-common-go/v2 aún no lo cubre)
```
