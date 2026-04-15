#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
#  gen-certs.sh — Genera los certificados SSL para NeXo Network
#
#  Uso:
#    chmod +x scripts/gen-certs.sh
#    ./scripts/gen-certs.sh
#
#  Genera:
#    certs/nexo-ca.crt       ← CA raíz — instalar en la Switch vía Atmosphere
#    certs/nexo-ca.key       ← Clave privada de la CA (guardar en secreto)
#    certs/server.crt        ← Certificado del servidor (para Fastify/nginx)
#    certs/server.key        ← Clave privada del servidor
#
#  Cómo instalar la CA en la Switch (Atmosphere CFW):
#    1. Copia nexo-ca.crt a la SD: /atmosphere/config/ssl/nexo-ca.crt
#       (o el nombre que requiera tu versión de Atmosphere)
#    2. Reinicia la Switch con Atmosphere
#    3. La Switch confiará en certificados firmados por esta CA
#
#  Requisito: openssl instalado en el sistema
# ══════════════════════════════════════════════════════════════════════════════

set -e

DOMAIN="${1:-nexonetwork.space}"
CERTS_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERTS_DIR"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   NeXo Network — Generador de certs  ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Dominio base: $DOMAIN"
echo "Carpeta:      $CERTS_DIR"
echo ""

# ── 1. Generar CA raíz ────────────────────────────────────────────────────────
echo "[1/4] Generando clave privada de la CA..."
openssl genrsa -out "$CERTS_DIR/nexo-ca.key" 4096 2>/dev/null

echo "[2/4] Generando certificado de la CA raíz..."
openssl req -new -x509 -days 3650 \
  -key "$CERTS_DIR/nexo-ca.key" \
  -out "$CERTS_DIR/nexo-ca.crt" \
  -subj "/C=ES/ST=Internet/L=Internet/O=NexoNetwork/OU=CA/CN=NexoNetwork Root CA" \
  2>/dev/null

# ── 2. Generar certificado del servidor ───────────────────────────────────────
echo "[3/4] Generando clave privada del servidor..."
openssl genrsa -out "$CERTS_DIR/server.key" 2048 2>/dev/null

echo "[4/4] Generando CSR y firmando con la CA..."

# Subject Alternative Names — cubrir todos los dominios Nintendo y NeXo
cat > "$CERTS_DIR/san.ext" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = *.${DOMAIN}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
# ── Dominio NeXo ──────────────────────────────────────────────────────────────
DNS.1  = ${DOMAIN}
DNS.2  = *.${DOMAIN}

# ── Auth chain ────────────────────────────────────────────────────────────────
DNS.3  = dauth-lp1.ndas.srv.nintendo.net
DNS.4  = aauth-lp1.ndas.srv.nintendo.net
DNS.5  = accounts.nintendo.com
DNS.6  = api.accounts.nintendo.com
DNS.7  = *.ndas.srv.nintendo.net

# ── BAAS (wildcard) ───────────────────────────────────────────────────────────
DNS.8  = *.baas.nintendo.com

# ── Lista de amigos ───────────────────────────────────────────────────────────
DNS.9  = friends.lp1.s.n.srv.nintendo.net
DNS.10 = friends-lp1.s.n.srv.nintendo.net
DNS.11 = *.s.n.srv.nintendo.net

# ── NPLN / NEX (juegos) ───────────────────────────────────────────────────────
DNS.12 = api.lp1.npln.srv.nintendo.net
DNS.13 = g9s300c4msl.lp1.s.n.srv.nintendo.net
DNS.14 = *.npln.srv.nintendo.net
DNS.15 = *.lp1.t.npln.srv.nintendo.net

# ── BCAT ──────────────────────────────────────────────────────────────────────
DNS.16 = bcat-list-lp1.cdn.nintendo.net
DNS.17 = bcat-dl-lp1.cdn.nintendo.net
DNS.18 = *.cdn.nintendo.net

# ── Captive portal ────────────────────────────────────────────────────────────
DNS.19 = ctest.cdn.nintendo.net
DNS.20 = nasc.nintendowifi.net

# ── Error reporting ───────────────────────────────────────────────────────────
DNS.21 = receive-lp1.er.srv.nintendo.net
DNS.22 = receive-lp1.dg.srv.nintendo.net
DNS.23 = pushmo.hac.lp1.er.nintendo.net

# ── System updates ────────────────────────────────────────────────────────────
DNS.24 = atum.hac.lp1.d4c.nintendo.net
DNS.25 = sun.hac.lp1.d4c.nintendo.net
DNS.26 = aqua.hac.lp1.d4c.nintendo.net

# ── eShop ─────────────────────────────────────────────────────────────────────
DNS.27 = tagaya.hac.lp1.eshop.nintendo.net
DNS.28 = shogun-lp1.eshop.nintendo.net
DNS.29 = beach.hac.lp1.eshop.nintendo.net
DNS.30 = *.eshop.nintendo.net

# ── Otros servicios Nintendo ──────────────────────────────────────────────────
DNS.31 = api.sect.srv.nintendo.net
DNS.32 = nifm.lp1.srv.nintendo.net
DNS.33 = *.nintendo.net
DNS.34 = *.nintendo.com
EOF

openssl req -new \
  -key "$CERTS_DIR/server.key" \
  -out "$CERTS_DIR/server.csr" \
  -config "$CERTS_DIR/san.ext" \
  2>/dev/null

openssl x509 -req -days 3650 \
  -in "$CERTS_DIR/server.csr" \
  -CA "$CERTS_DIR/nexo-ca.crt" \
  -CAkey "$CERTS_DIR/nexo-ca.key" \
  -CAcreateserial \
  -out "$CERTS_DIR/server.crt" \
  -extensions v3_req \
  -extfile "$CERTS_DIR/san.ext" \
  2>/dev/null

# Limpiar archivos temporales
rm -f "$CERTS_DIR/server.csr" "$CERTS_DIR/san.ext" "$CERTS_DIR/nexo-ca.srl"

echo ""
echo "✅ Certificados generados en $CERTS_DIR/"
echo ""
echo "   nexo-ca.crt  ← Instalar en la Switch (Atmosphere)"
echo "   server.crt   ← Configurar en Fastify / nginx"
echo "   server.key   ← Clave privada del servidor"
echo ""
echo "━━━ SIGUIENTE PASO — SWITCH (Atmosphere) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Instala la CA en la Switch:"
echo "     Copia nexo-ca.crt a la SD → /atmosphere/config/exefs_patches/"
echo "     O usa la app homebrew NX-CA-Installer para instalarla."
echo ""
echo "  2. Configura los hosts de Atmosphere:"
echo "     Copia scripts/atmosphere-hosts.txt a la SD → /atmosphere/hosts/default.txt"
echo "     Edita el archivo y reemplaza TU_IP_AQUI por la IP de tu servidor."
echo ""
echo "  3. Activa HTTPS en el servidor:"
echo "     Añade NEXO_HTTPS=true en tu .env"
echo ""
echo "  4. Reinicia la Switch con Atmosphere y ya debería conectar a NeXoNetwork."
echo ""
echo "  Para más detalles: ver docs/switch-setup.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
