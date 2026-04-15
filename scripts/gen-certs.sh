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
DNS.1  = ${DOMAIN}
DNS.2  = *.${DOMAIN}
DNS.3  = *.nintendo.net
DNS.4  = *.nintendo.com
DNS.5  = *.ndas.srv.nintendo.net
DNS.6  = *.npln.srv.nintendo.net
DNS.7  = *.baas.nintendo.com
DNS.8  = *.s.n.srv.nintendo.net
DNS.9  = friends.lp1.s.n.srv.nintendo.net
DNS.10 = api.lp1.npln.srv.nintendo.net
DNS.11 = g9s300c4msl.lp1.s.n.srv.nintendo.net
DNS.12 = accounts.nintendo.com
DNS.13 = *.cdn.nintendo.net
DNS.14 = dauth-lp1.ndas.srv.nintendo.net
DNS.15 = aauth-lp1.ndas.srv.nintendo.net
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
echo "━━━ SIGUIENTE PASO — SWITCH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Copia nexo-ca.crt a la SD de la Switch:"
echo "     SD:/atmosphere/config/ssl/nexo-ca.crt"
echo ""
echo "  2. En tu router o Pi-hole, añade estos registros DNS:"
echo "     dauth-lp1.ndas.srv.nintendo.net    → IP DE TU SERVIDOR"
echo "     aauth-lp1.ndas.srv.nintendo.net    → IP DE TU SERVIDOR"
echo "     accounts.nintendo.com              → IP DE TU SERVIDOR"
echo "     friends.lp1.s.n.srv.nintendo.net   → IP DE TU SERVIDOR"
echo "     *.baas.nintendo.com                → IP DE TU SERVIDOR"
echo "     api.lp1.npln.srv.nintendo.net      → IP DE TU SERVIDOR"
echo ""
echo "  3. Activa HTTPS en el servidor:"
echo "     Pon NEXO_HTTPS=true en tu .env"
echo "     (o edita src/server.js para cargar los certs)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
