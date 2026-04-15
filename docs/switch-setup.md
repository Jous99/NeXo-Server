# Conectar Nintendo Switch moddeada a NeXoNetwork

Esta guía explica cómo hacer que tu Nintendo Switch con Atmosphere CFW se conecte a tu servidor NeXoNetwork en lugar de los servidores oficiales de Nintendo.

---

## Cómo funciona

La Switch hace peticiones HTTPS a varios dominios de Nintendo (ej: `dauth-lp1.ndas.srv.nintendo.net`). Para interceptarlas necesitamos dos cosas:

1. **DNS redirect** — Atmosphere puede sobrescribir qué IP responde para cada dominio. Cuando la Switch resuelve `dauth-lp1.ndas.srv.nintendo.net`, en lugar de la IP de Nintendo devuelve la IP de tu servidor.

2. **Certificado SSL** — La Switch verifica que el certificado HTTPS sea válido. Como ahora es tu servidor quien responde, necesita un certificado firmado por una CA en la que la Switch confíe. Instalamos nuestra propia CA en la Switch.

```
Switch → DNS resolve "dauth-lp1.ndas.srv.nintendo.net"
       → Atmosphere devuelve IP de tu servidor
       → Switch abre HTTPS con tu servidor
       → Tu servidor presenta server.crt (firmado por nexo-ca.crt)
       → Switch verifica: nexo-ca.crt está en su lista de CAs de confianza ✅
       → Conexión establecida → Tu servidor responde con los stubs NeXo
```

---

## Requisitos

- Nintendo Switch con **Atmosphere 1.0+**
- Servidor NeXoNetwork corriendo con **NEXO_HTTPS=true**
- OpenSSL instalado en tu PC o servidor (para generar los certs)

---

## Paso 1 — Generar los certificados

En el servidor, ejecuta:

```bash
chmod +x scripts/gen-certs.sh
./scripts/gen-certs.sh
```

Esto genera en la carpeta `certs/`:
- `nexo-ca.crt` — CA raíz que instalarás en la Switch
- `server.crt` + `server.key` — Certificado del servidor

---

## Paso 2 — Instalar la CA en la Switch

La Switch necesita confiar en tu CA para validar los certificados de tu servidor.

### Opción A — Atmosphere exefs patches (recomendada)

Atmosphere puede parchear el módulo SSL del sistema para añadir CAs adicionales.

1. Descarga el homebrew **[NX-CA-Installer](https://github.com/HookedBehemoth/sys-clk)** (busca la versión actual para tu firmware).
2. Copia `nexo-ca.crt` a la SD: `SD:/config/nx-ca-installer/nexo-ca.crt`
3. Ejecuta la app desde el Homebrew Menu.
4. La CA quedará instalada permanentemente en tu Switch.

### Opción B — Parche manual del sysmodule ssl

Si tienes experiencia con patches de Atmosphere, puedes añadir la CA directamente al bundle de certificados del sistema:

1. Extrae el certificado bundle de tu firmware (archivo `ssl` en el NAND).
2. Añade `nexo-ca.crt` al bundle con OpenSSL.
3. Reemplaza el archivo via exefs patches.

> Esta opción es más compleja y depende de la versión del firmware. No se documenta aquí en detalle.

---

## Paso 3 — Configurar el archivo hosts de Atmosphere

El archivo `scripts/atmosphere-hosts.txt` contiene la plantilla con todos los dominios de Nintendo que necesitas redirigir.

### 3.1 Editar la IP

Abre `scripts/atmosphere-hosts.txt` y reemplaza `TU_IP_AQUI` por la IP pública de tu servidor NeXoNetwork.

Si el servidor está en tu red local (para pruebas): usa la IP local, ej `192.168.1.100`.

### 3.2 Copiar a la SD

Copia el archivo editado a tu SD card:

```
SD:/atmosphere/hosts/default.txt
```

Si solo quieres que aplique a un juego específico, usa el title ID como nombre:

```
SD:/atmosphere/hosts/0100000000100000.txt   ← Solo Super Mario Maker 2
```

### 3.3 BAAS por juego

Atmosphere no soporta wildcards en los hosts (`*.baas.nintendo.com`), así que hay que añadir el subdominio BAAS específico de cada juego. El archivo ya incluye los más comunes, pero si un juego no conecta, busca su subdominio BAAS:

Método para encontrarlo: con un proxy (ej: mitmproxy) intercepta el tráfico de la Switch y busca peticiones a `*.baas.nintendo.com`. El subdominio que aparezca es el que tienes que añadir.

---

## Paso 4 — Activar HTTPS en el servidor

En el `.env` del servidor:

```env
NEXO_HTTPS=true
```

Reinicia el servidor. Ahora escucha en HTTPS con los certificados de `certs/`.

---

## Paso 5 — Reiniciar la Switch

Apaga la Switch, inserta la SD con el archivo hosts y la CA instalada, y arranca con Atmosphere. El DNS override ya está activo.

Para verificar que funciona: ve a **Configuración del sistema → Internet → Configuración de red** y ejecuta el test de conexión. Debería pasar sin errores.

---

## Verificar que la Switch conecta a tu servidor

En los logs del servidor (`pm2 logs nexo-server`), cuando la Switch arranque deberías ver:

```
POST /v6/device_auth_token       ← dauth
POST /v3/application_auth_token  ← aauth
POST /connect/1.0.0/api/token    ← accounts.nintendo.com
POST /v1/Login                   ← BAAS
GET  /v1/users/:pid/friends      ← friends API
```

---

## Servicios que se reemplazan

| Dominio Nintendo | Módulo NeXo | Función |
|---|---|---|
| `dauth-lp1.ndas.srv.nintendo.net` | accounts-api | Device auth token |
| `aauth-lp1.ndas.srv.nintendo.net` | accounts-api | App auth token |
| `accounts.nintendo.com` | accounts-api | OAuth token |
| `*.baas.nintendo.com` | accounts-api | User login |
| `friends.lp1.s.n.srv.nintendo.net` | switch-friends | Lista de amigos |
| `bcat-list-lp1.cdn.nintendo.net` | bcat | Noticias de juegos |
| `ctest.cdn.nintendo.net` | connector | Test de conectividad |
| `receive-lp1.er.srv.nintendo.net` | nintendo-stubs | Error reporting |
| `atum.hac.lp1.d4c.nintendo.net` | nintendo-stubs | Actualizaciones sistema |
| `tagaya.hac.lp1.eshop.nintendo.net` | nintendo-stubs | Versiones de títulos |
| `g9s300c4msl.lp1.s.n.srv.nintendo.net` | smm2 | Super Mario Maker 2 |

---

## Servicios que NO se reemplazan (todavía)

Estos dominios no están en el hosts file, por lo que la Switch sigue conectándose a Nintendo para ellos. No afectan al online de los juegos:

- `cfw.hac.lp1.allerway.nintendo.net` — Nintendo CDN para parches
- `pptest.nintendo.net` — Test de conectividad alternativo (no crítico)
- La Nintendo eShop completa (compras, descargas)

---

## Troubleshooting

**El test de conexión falla con error 2110-3127:**
El DNS override no está activo. Verifica que el archivo está en `SD:/atmosphere/hosts/default.txt` y que Atmosphere arrancó correctamente (debe aparecer el menú de Atmosphere al mantener VOL+).

**Error de certificado / 2155-8007:**
La CA no está instalada o el servidor no tiene NEXO_HTTPS=true. Verifica ambas cosas.

**Los juegos conectan pero dicen "error de comunicación":**
El subdominio BAAS del juego no está en el hosts file. Añádelo (ver Paso 3.3).

**El servidor muestra requests pero los juegos siguen fallando:**
Revisa los logs con `pm2 logs nexo-server` y busca el error específico que devuelve el servidor.
