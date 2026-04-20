#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
#  setup-https.sh — Activa HTTPS en el servidor NeXoNetwork
#
#  Ejecutar en el VPS (como root o con sudo):
#    chmod +x scripts/setup-https.sh
#    ./scripts/setup-https.sh
#
#  Lo que hace:
#    1. Genera los certificados SSL (CA + servidor) via gen-certs.sh
#    2. Activa NEXO_HTTPS=true en el .env
#    3. Recarga PM2 para aplicar los cambios
# ══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   NeXoNetwork — Activar HTTPS            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Generar certificados ───────────────────────────────────────────────────
echo "[1/3] Generando certificados SSL..."
chmod +x "$SCRIPT_DIR/gen-certs.sh"
"$SCRIPT_DIR/gen-certs.sh"

# ── 2. Activar NEXO_HTTPS en .env ────────────────────────────────────────────
echo "[2/3] Activando NEXO_HTTPS en .env..."
ENV_FILE="$ROOT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: No se encontró el archivo .env en $ROOT_DIR"
    echo "Crea el .env primero (copia .env.example y rellena los valores)."
    exit 1
fi

# Reemplaza NEXO_HTTPS=false por NEXO_HTTPS=true
if grep -q "^NEXO_HTTPS=" "$ENV_FILE"; then
    sed -i 's/^NEXO_HTTPS=.*/NEXO_HTTPS=true/' "$ENV_FILE"
    echo "   ✅ NEXO_HTTPS=true activado en .env"
else
    echo "NEXO_HTTPS=true" >> "$ENV_FILE"
    echo "   ✅ NEXO_HTTPS=true añadido al .env"
fi

# ── 3. Recargar el servidor ───────────────────────────────────────────────────
echo "[3/3] Recargando el servidor..."

if command -v pm2 &>/dev/null; then
    PM2_APP=$(pm2 list --no-color 2>/dev/null | grep -oE 'nexo[^ ]*|NeXo[^ ]*' | head -1)
    if [ -n "$PM2_APP" ]; then
        pm2 restart "$PM2_APP" --update-env
        echo "   ✅ PM2 app '$PM2_APP' reiniciada"
    else
        pm2 restart all --update-env 2>/dev/null || echo "   ⚠ No se pudo reiniciar PM2 automáticamente. Hazlo manualmente."
    fi
else
    echo "   ⚠ PM2 no encontrado. Reinicia el servidor manualmente:"
    echo "      cd $ROOT_DIR && node src/server.js"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ HTTPS activado. El servidor ahora escucha en HTTPS."
echo ""
echo "SIGUIENTE PASO — Instalar el certificado en la Switch:"
echo ""
echo "   1. Descarga el certificado CA desde el servidor:"
echo "      scp root@nexonetwork.space:$(pwd)/certs/nexo-ca.crt ."
echo ""
echo "   2. Copia nexo-ca.crt a la tarjeta SD de la Switch:"
echo "      /atmosphere/config/exefs_patches/nexo_ca.crt"
echo "      (o usa la app homebrew NX-CA-Installer)"
echo ""
echo "   3. Copia el archivo hosts a la SD:"
echo "      /atmosphere/hosts/default.txt"
echo "      (edita y pon la IP real de tu servidor)"
echo ""
echo "   4. Lee docs/switch-setup.md para el proceso completo paso a paso."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
