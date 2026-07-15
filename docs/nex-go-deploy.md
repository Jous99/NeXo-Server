# Despliegue del auth server Go (mk8-auth)

Complementa [deploy.md](./deploy.md). Cubre el proceso Go nuevo introducido en
[nex-server/](../nex-server) — ver [nex-server/README.md](../nex-server/README.md)
para el alcance exacto (solo ticket-granting de MK8D, UDP real).

---

## Arquitectura

```
Switch moddeada (Atmosphere)
    │  UDP directo — Nginx NO proxea UDP
    ▼
mk8-auth (Go, PM2/systemd) — puerto UDP NEXO_MK8_AUTH_UDP_PORT
    │
    ▼
MySQL (misma DB que Node — tabla users: id [= PID de NEX], nex_password)
```

El proceso Node/PM2 existente (puerto 3000, detrás de Nginx) no cambia.
`mk8-auth` es un proceso aparte, con su propio puerto UDP.

---

## 1. Instalar Go en el VPS

```bash
# Debian/Ubuntu — ajusta la versión a la que uses en desarrollo (ver go.mod)
wget https://go.dev/dl/go1.23.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.23.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc && source ~/.bashrc
go version
```

## 2. Build

```bash
cd /www/wwwroot/nexo-server/nex-server   # o donde esté el checkout
go build -o mk8-auth ./cmd/mk8-auth
```

## 3. Variables de entorno

`mk8-auth` lee el mismo `.env` que Node (`../.env` relativo a `nex-server/`).
Añade las variables de la sección "NEX Go — Auth server" en
[.env.example](../.env.example) a tu `.env` de producción. **No arranca**
sin `NEXO_MK8_ACCESS_KEY` y `NEXO_MK8_SECURE_PASSWORD` configurados.

## 4. Proceso (PM2)

```bash
pm2 start ./nex-server/mk8-auth --name nexo-mk8-auth
pm2 save
```

(O un servicio `systemd` si prefieres no depender de PM2 para procesos no-Node.)

## 5. Firewall — puerto UDP directo

Nginx **no proxea UDP** por defecto (el resto del despliegue es HTTP/WSS vía
`proxy_pass`, ver [deploy.md](./deploy.md)). Abre el puerto UDP directo:

```bash
# aaPanel: Seguridad → Reglas del firewall → añadir regla UDP
# o directamente con ufw:
sudo ufw allow 60000/udp   # o el puerto que hayas puesto en NEXO_MK8_AUTH_UDP_PORT
```

No hace falta tocar la config de Nginx ni los certs TLS existentes
(`certs/server.crt`) — PRUDP usa su propio cifrado Kerberos, no TLS.

## 6. Actualizar (`scripts/update.sh`)

`scripts/update.sh` compila y reinicia `nex-server` automáticamente tras el
`git pull`, además del proceso Node — no hace falta hacerlo a mano. Es
defensivo: si Go no está instalado en el VPS, salta ese paso con un aviso en
vez de romper el resto de la actualización; y si el proceso `nexo-mk8-auth`
todavía no está registrado en PM2 (primera vez, antes de configurar
`NEXO_MK8_*`), deja el binario compilado y listo pero no lo arranca solo —
arráncalo tú la primera vez, una vez tengas la config:

```bash
cd nex-server && pm2 start ./mk8-auth --name nexo-mk8-auth && pm2 save
```

A partir de ahí, cada `scripts/update.sh` ya lo recompila y reinicia solo.

## 7. Antes de probar contra una Switch real

Confirma `NEXO_MK8_ACCESS_KEY` y `NEXO_MK8_NEX_VERSION` — ver la tabla de
"Valores SIN CONFIRMAR" en [nex-server/README.md](../nex-server/README.md).
Sin el AccessKey correcto, el juego rechaza los paquetes silenciosamente (no
hay mensaje de error visible en consola).
