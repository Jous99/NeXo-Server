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

# 5. Compilar y reiniciar nex-server (Go) — ver nex-server/README.md.
# Defensivo: no todos los despliegues tienen Go instalado ni han configurado
# NEXO_MK8_* todavía, así que esto nunca debe romper el resto del update.
if [ -d "$PROJECT_DIR/nex-server" ]; then
    if command -v go > /dev/null 2>&1; then
        log "Compilando nex-server (Go)..."
        if (cd "$PROJECT_DIR/nex-server" && go build -o mk8-auth ./cmd/mk8-auth); then
            log "nex-server compilado correctamente."

            if pm2 describe nexo-mk8-auth > /dev/null 2>&1; then
                pm2 restart nexo-mk8-auth
                log "nexo-mk8-auth reiniciado correctamente."
            else
                log "nexo-mk8-auth no está registrado en PM2 — no se arranca automáticamente"
                log "(necesita NEXO_MK8_ACCESS_KEY / NEXO_MK8_SECURE_PASSWORD configurados primero,"
                log "ver docs/nex-go-deploy.md). El binario ya quedó compilado y listo para cuando lo arranques."
            fi
        else
            log "ERROR: falló la compilación de nex-server — se deja el binario anterior tal cual."
        fi
    else
        log "ADVERTENCIA: Go no está instalado — saltando build de nex-server (ver docs/nex-go-deploy.md)."
    fi
fi

log "=== Actualización completada ==="
