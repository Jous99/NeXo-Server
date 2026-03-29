#!/bin/bash
# NeXo-Server — Script de actualización desde Forgejo
# Uso: bash scripts/update.sh
# También llamado por el panel admin vía /admin/system/update

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/update.log"

mkdir -p "$PROJECT_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Iniciando actualización NeXo-Server ==="
cd "$PROJECT_DIR"

# 1. Guardar hash actual para detectar cambios en package.json
OLD_PKG_HASH=$(md5sum package.json 2>/dev/null | cut -d' ' -f1 || echo "")

# 2. Pull desde Forgejo
log "Haciendo git pull..."
git fetch origin main
git reset --hard origin/main
log "Pull completado."

# 3. Instalar dependencias solo si package.json cambió
NEW_PKG_HASH=$(md5sum package.json 2>/dev/null | cut -d' ' -f1 || echo "")
if [ "$OLD_PKG_HASH" != "$NEW_PKG_HASH" ]; then
    log "package.json cambió — ejecutando npm install..."
    npm install --production
    log "npm install completado."
else
    log "package.json sin cambios — saltando npm install."
fi

# 4. Reiniciar con PM2
log "Reiniciando proceso PM2..."
if pm2 describe nexo-server > /dev/null 2>&1; then
    pm2 restart nexo-server
    log "Proceso reiniciado correctamente."
else
    log "ADVERTENCIA: Proceso 'nexo-server' no encontrado en PM2."
    log "Iniciando nuevo proceso..."
    pm2 start src/server.js --name nexo-server
fi

log "=== Actualización completada ==="
