# NeXoNetwork — Configuración de Nintendo Switch

Guía completa para conectar tu Nintendo Switch modificada (Atmosphere CFW)
a NeXoNetwork y vincular una cuenta desde el menú HOME.

---

## Requisitos previos

- Nintendo Switch con **Atmosphere CFW** (versión 1.4.0 o superior)
- **sigpatches** actualizados (para ejecutar juegos sin firma)
- Servidor NeXoNetwork corriendo en `nexonetwork.space` (o tu dominio)
- Acceso al VPS por SSH (para los pasos del servidor)

---

## Paso 1 — Activar HTTPS en el servidor

La Switch *siempre* verifica certificados SSL cuando hace peticiones a Nintendo.
Si el servidor no tiene HTTPS, la Switch ignorará las respuestas.

Ejecuta esto en el VPS:

```bash
# En el VPS, dentro de la carpeta del servidor
chmod +x scripts/setup-https.sh
./scripts/setup-https.sh
```

Esto genera los certificados y activa `NEXO_HTTPS=true` automáticamente.

Si quieres hacerlo manualmente:

```bash
./scripts/gen-certs.sh          # genera certs/nexo-ca.crt y certs/server.crt
# Luego edita .env:
NEXO_HTTPS=true
# Y reinicia el servidor en PM2
pm2 restart nexo --update-env
```

---

## Paso 2 — Desactivar la verificación de certificados en la Switch

**Corrección (verificado investigando el ecosistema real de Atmosphere):**
No existe ninguna app "NX-CA-Installer" ni una carpeta `/atmosphere/config/ssl/`
que instale una CA personalizada — eso no es real. El método real y usado por
la comunidad es instalar los parches `exefs_patches` que desactivan la
verificación de certificados por completo, para que la Switch acepte el
certificado autofirmado que genera `gen-certs.sh` sin necesitar una CA de
confianza.

### Descargar los parches

1. Busca en [misson20000/exefs_patches](https://github.com/misson20000/exefs_patches)
   (o forks/PRs activos si tu firmware es muy reciente) las carpetas
   `disable_ca_verification` y `disable_browser_ca_verification`.
2. Descarga el repo/fork completo como ZIP (botón "Code" → "Download ZIP") —
   más fiable que copiar nombres de archivo en hexadecimal a mano.
3. **Verifica compatibilidad con tu firmware exacto** antes de instalar —
   estos parches son específicos de firmware. Si tu firmware es muy reciente
   y no aparece cubierto en el repo principal, revisa si hay un PR abierto
   portando el parche a tu versión, o pregunta en la comunidad (GBAtemp,
   Discord de ReSwitched) antes de instalar.

### Instalar en la SD

```
SD:/
 └── atmosphere/
      ├── exefs_patches/
      │    └── disable_ca_verification/       ← copia aquí los .ips de esa carpeta
      └── nro_patches/
           └── disable_browser_ca_verification/  ← copia aquí los .ips de esa carpeta
```

No hace falta identificar el archivo "correcto" a mano — Atmosphere solo
aplica el `.ips` cuyo hash coincide con el módulo real que tienes cargado,
e ignora los demás sin fallar. Reinicia la Switch con Atmosphere.

---

## Paso 3 — Configurar los hosts de Atmosphere

Los hosts de Atmosphere funcionan como el archivo `hosts` de Windows/Linux:
redirigen los dominios de Nintendo a tu servidor en lugar de a los de Nintendo.

### Editar el archivo de hosts

**Corrección de formato:** el formato real de Atmosphere es **IP primero,
dominio después** (como un hosts file normal) — no soporta un dominio como
destino, solo IPs literales. Abre `scripts/atmosphere-hosts.txt` y reemplaza
`TU_IP_AQUI` con la IP de tu servidor:

```
# Antes:
TU_IP_AQUI dauth-lp1.ndas.srv.nintendo.net

# Después (ejemplo):
185.123.45.67 dauth-lp1.ndas.srv.nintendo.net
```

> Si la Switch está en la misma red local que tu servidor, usa su IP local
> (ej: `192.168.0.154`) en vez de la IP pública o el dominio — muchos
> routers no soportan NAT loopback y la conexión fallaría en la misma LAN.

### Copiar a la SD

```
SD:/
 └── atmosphere/
      └── hosts/
           └── default.txt    ← pega el contenido del archivo editado aquí
```

> **¿Esto me puede banear?** No. Los hosts de Atmosphere redirigen el tráfico
> DESDE la Switch HACIA tu servidor. La Switch nunca llega a los servidores
> de Nintendo, por lo que Nintendo no puede detectar nada.
> Es el mismo mecanismo que usa 90DNS.

---

## Paso 4 — Vincular una cuenta desde el menú HOME

Este es el paso que permite iniciar sesión con tu cuenta de NeXoNetwork
directamente desde el menú HOME de la Switch, igual que se hace con Nintendo Account.

### Proceso paso a paso

1. En la Switch, ve a: **Configuración del sistema** → **Usuarios** → tu perfil
2. Selecciona **"Vincular cuenta de Nintendo"**
3. La Switch abrirá su navegador web y cargará la **página de login de NeXoNetwork**
   (interceptamos `accounts.nintendo.com` con nuestro servidor)
4. Verás la pantalla de **NeXoNetwork — Cuenta**:
   - **Si ya tienes cuenta** → escribe tu usuario y contraseña → **Entrar →**
   - **Si eres nuevo** → toca la pestaña **"Crear cuenta"** → rellena los campos → **Crear cuenta →**
5. La Switch recibirá el token y vinculará la cuenta automáticamente
6. En el perfil de usuario aparecerá tu nombre de NeXoNetwork

### Qué pasa detrás de escena

```
Switch → GET accounts.nintendo.com/connect/1.0.0/authorize
       ← NeXo sirve página HTML de login

Usuario introduce credenciales
Switch → POST accounts.nintendo.com/connect/1.0.0/authorize
       ← NeXo valida, genera código OAuth, redirige a npifr://

Switch → POST accounts.nintendo.com/connect/1.0.0/api/session_token
       ← NeXo devuelve session_token (JWT con tu nexo_id)

Switch → POST accounts.nintendo.com/connect/1.0.0/api/token
       ← NeXo devuelve access_token con tu nexo_id y nickname

Switch → GET accounts.nintendo.com/2.0.0/users/me
       ← NeXo devuelve tu perfil (nombre, país, etc.)

Cuenta vinculada — la Switch muestra tu nombre de NeXoNetwork
```

---

## Paso 5 — Verificar la conexión

Reinicia la Switch con Atmosphere y comprueba:

1. **Menú HOME → Configuración del sistema → Internet → Configuración de internet**
   → Prueba de conexión → debería decir "Conectado"

2. **Perfil de usuario** → debería mostrar el nombre de NeXoNetwork después de vincular

3. **Jugar online** → abre un juego compatible y prueba el modo online

### Diagnóstico si algo falla

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| Switch no conecta | Hosts no copiados o IP incorrecta | Revisa `/atmosphere/hosts/default.txt` |
| Error SSL / certificado | Parches `disable_ca_verification` no instalados o no compatibles con tu firmware | Revisa `/atmosphere/exefs_patches/disable_ca_verification/` y `/atmosphere/nro_patches/disable_browser_ca_verification/` |
| Página de login no carga | HTTPS no activado en servidor | Ejecuta `setup-https.sh` |
| Login falla con "Error de auth" | Usuario o contraseña incorrectos | Prueba crear cuenta nueva |
| Juego no conecta en online | Juego no en lista de títulos compatibles | Añade el title_id en `scripts/migrate.sql` |

---

## Paso 6 — (Opcional) Crear cuenta desde la web

También puedes crear tu cuenta desde el panel web antes de usar la Switch:

1. Abre `https://nexonetwork.space` en tu PC
2. Regístrate con usuario, email y contraseña
3. En la Switch, usa esas mismas credenciales para vincular la cuenta

---

## Referencia rápida — Estructura de archivos en la SD

```
SD:/
 ├── atmosphere/
 │    ├── exefs_patches/
 │    │    └── disable_ca_verification/       ← desactiva verificación SSL (sysmodules)
 │    ├── nro_patches/
 │    │    └── disable_browser_ca_verification/ ← desactiva verificación SSL (browser)
 │    └── hosts/
 │         └── default.txt                    ← redirección de dominios Nintendo (IP primero)
 └── ...
```

---

## Archivos relacionados

| Archivo | Descripción |
|---------|-------------|
| `scripts/setup-https.sh` | Activa HTTPS en el servidor (ejecutar en VPS) |
| `scripts/gen-certs.sh` | Genera los certificados SSL |
| `scripts/atmosphere-hosts.txt` | Template del archivo hosts para la SD |
| `scripts/migrate.sql` | Schema de la base de datos |
| `scripts/test.js` | Test completo de todos los endpoints |
