# Guía de despliegue — aaPanel + Node Project

Esta guía explica cómo desplegar NeXo-Server en un VPS con aaPanel, usando Node Project para que el mismo proceso sirva tanto la web como la API.

---

## Arquitectura de despliegue

```
Internet
    │
    ▼
aaPanel Nginx (reverse proxy, SSL)
    │
    ▼
Node.js / PM2 — NeXo-Server (puerto 3000)
    │
    ├── GET /           → Web pública (landing page)
    ├── GET /portal/*   → Portal de usuario
    ├── GET /admin/*    → Panel de administración
    ├── /auth/*         → Módulo accounts
    ├── /profile/*      → Módulo accounts
    ├── /friends/*      → Módulo accounts
    └── /api/v1/*       → Protocolo RaptorNetwork (emulador)
```

---

## 1. Preparar el servidor

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar aaPanel (si no está instalado)
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh
bash install.sh

# Desde aaPanel, instalar:
# - Nginx
# - MySQL 8.0
# - Node.js 20+ (desde App Store → Runtime)
# - PM2 (desde App Store → Runtime)
```

---

## 2. Clonar el repositorio

```bash
# Desde SSH o la terminal de aaPanel
cd /www/wwwroot
git clone https://forgejo.joustech.space/NeXo/NeXoNetwork-Server nexo-server
cd nexo-server
```

> Si el repo es privado, configura un deploy key en Forgejo y añádelo a `~/.ssh/config`.

---

## 3. Configurar entorno

```bash
cp .env.example .env
nano .env
```

Rellena al menos:
```env
PORT=3000
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=nexo_user
DB_PASSWORD=TU_CONTRASEÑA_SEGURA
DB_NAME=nexo_network

JWT_SECRET=GENERA_UNO_LARGO_Y_ALEATORIO_MINIMO_64_CHARS
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Para el panel admin de auto-update
FORGEJO_REPO_URL=https://forgejo.joustech.space/NeXo/NeXoNetwork-Server.git
FORGEJO_TOKEN=tu_token_de_acceso_forgejo
ADMIN_UPDATE_SECRET=otra_clave_secreta_para_el_webhook
```

---

## 4. Base de datos

```bash
# Crear usuario y base de datos desde MySQL
mysql -u root -p

CREATE DATABASE nexo_network CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexo_user'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA_SEGURA';
GRANT ALL PRIVILEGES ON nexo_network.* TO 'nexo_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Importar schema
mysql -u nexo_user -p nexo_network < /www/wwwroot/nexo-server/schema.sql
```

---

## 5. Instalar dependencias

```bash
cd /www/wwwroot/nexo-server
npm install --production
```

---

## 6. Crear Node Project en aaPanel

1. Ir a **Website** → **Node Project** → **Add Node Project**
2. Configurar:
   - **Project name**: `nexo-server`
   - **Project path**: `/www/wwwroot/nexo-server`
   - **Entry file**: `src/server.js`
   - **Node version**: 20+
   - **Port**: `3000`
   - **Startup mode**: PM2
3. Clic en **Submit**

aaPanel arrancará el proceso con PM2 automáticamente.

---

## 7. Configurar dominio y SSL

1. Ir a **Website** → **Add Site**
2. Domain: `nexonetwork.space` (y `www.nexonetwork.space`)
3. PHP: **Pure Static** (no necesitas PHP)
4. Después de crear el site, ir a su configuración → **Proxy**:
   - Enable Proxy: ✅
   - Proxy URL: `http://127.0.0.1:3000`
5. Activar **SSL** → Let's Encrypt → Apply

---

## 8. Verificar

```bash
# Ver logs del proceso
pm2 logs nexo-server

# Estado
pm2 status

# Test rápido
curl http://localhost:3000/health
```

Deberías ver: `{"ok":true,"service":"nexo-server","ts":...}`

---

## Scripts de gestión

```bash
# Reiniciar
pm2 restart nexo-server

# Detener
pm2 stop nexo-server

# Ver logs en tiempo real
pm2 logs nexo-server --lines 50

# Actualizar desde Forgejo (también disponible desde el panel admin)
cd /www/wwwroot/nexo-server && bash scripts/update.sh
```

---

## Actualización automática desde el panel admin

El panel admin de la web incluye un botón "Actualizar servidor" que:

1. Llama a `POST /admin/system/update` (protegido con JWT de admin)
2. El servidor ejecuta `git pull` desde Forgejo
3. Ejecuta `npm install` si `package.json` cambió
4. Reinicia el proceso PM2

Para que funcione, el usuario que ejecuta Node debe tener permiso de escritura en la carpeta y acceso a `pm2`. En aaPanel esto ya está configurado por defecto.

---

## Solución de problemas

**El proceso no arranca:**
```bash
cd /www/wwwroot/nexo-server && node src/server.js
# Ver el error directamente
```

**Error de conexión a MySQL:**
```bash
# Verificar que el usuario existe y tiene permisos
mysql -u nexo_user -p nexo_network -e "SELECT 1;"
```

**Puerto 3000 ocupado:**
```bash
lsof -i :3000
# Cambiar PORT en .env si es necesario
```
