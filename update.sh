#!/bin/bash

# --- CONFIGURACIÓN DE RUTAS ---
TARGET="/www/wwwroot/nexo-backend"
PM2_NAME="nexo-server"

echo "==============================================="
echo "   NEXO NETWORK - INICIANDO ACTUALIZACIÓN      "
echo "==============================================="

# 1. Entrar a la carpeta del servidor
cd $TARGET || { echo "Error: No se encontró la carpeta"; exit 1; }

# 2. Asegurar que somos los dueños de los archivos (evita errores EACCES)
sudo chown -R $USER:$USER .

# 3. Limpiar cualquier cambio local y traer lo nuevo de Forgejo
echo "[1/4] Descargando cambios desde Forgejo..."
git fetch --all
git reset --hard origin/main
git pull origin main

# 4. Instalar dependencias nuevas
echo "[2/4] Verificando paquetes de Node.js..."
npm install --no-audit --no-fund

# 5. Reiniciar el proceso en PM2
echo "[3/4] Reiniciando servidor en puerto 4000..."
pm2 restart $PM2_NAME

# 6. Mostrar estado final
echo "[4/4] Verificando estado..."
pm2 status $PM2_NAME

echo "==============================================="
echo "      ¡ACTUALIZACIÓN COMPLETADA CON ÉXITO!     "
echo "==============================================="