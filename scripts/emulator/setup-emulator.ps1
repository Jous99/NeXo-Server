#Requires -RunAsAdministrator
<#
.SYNOPSIS
    NeXoNetwork — Setup automático para emulador NeXo-emu en Windows
.DESCRIPTION
    Este script:
      1. Obtiene la IP de nexonetwork.space automáticamente
      2. Instala el certificado CA de NeXoNetwork en Windows
      3. Actualiza el archivo hosts de Windows con los dominios de Nintendo
      4. Configura el emulador NeXo-emu para usar NeXoNetwork
.NOTES
    Ejecutar como Administrador:
    PowerShell -ExecutionPolicy Bypass -File setup-emulator.ps1
#>

$ErrorActionPreference = "Stop"
$NEXO_DOMAIN = "nexonetwork.space"
$HOSTS_FILE  = "C:\Windows\System32\drivers\etc\hosts"
$MARKER_START = "# ── NeXoNetwork START ──"
$MARKER_END   = "# ── NeXoNetwork END ──"
$EMU_DIR      = "$env:USERPROFILE\Documents\NeXo-emu"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     NeXoNetwork — Emulator Setup         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── 1. Resolver IP de nexonetwork.space ───────────────────────────────────────
Write-Host "[1/4] Resolviendo IP de $NEXO_DOMAIN..." -ForegroundColor Yellow
try {
    $nexoIP = (Resolve-DnsName $NEXO_DOMAIN -Type A -ErrorAction Stop | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1).IPAddress
    Write-Host "      IP: $nexoIP" -ForegroundColor Green
} catch {
    Write-Host "      Error resolviendo $NEXO_DOMAIN. ¿Tienes internet?" -ForegroundColor Red
    Write-Host "      Introduce la IP manualmente: " -ForegroundColor Yellow -NoNewline
    $nexoIP = Read-Host
}

# ── 2. Instalar certificado CA ────────────────────────────────────────────────
Write-Host "[2/4] Instalando certificado CA de NeXoNetwork..." -ForegroundColor Yellow
$certPath = Join-Path $PSScriptRoot "..\certs\nexo-ca.crt"
if (Test-Path $certPath) {
    try {
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath)
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
        $store.Open("ReadWrite")
        # Verificar si ya está instalado
        $existing = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
        if ($existing) {
            Write-Host "      Certificado ya instalado." -ForegroundColor Green
        } else {
            $store.Add($cert)
            Write-Host "      Certificado instalado correctamente." -ForegroundColor Green
        }
        $store.Close()
    } catch {
        Write-Host "      Error instalando certificado: $_" -ForegroundColor Red
        Write-Host "      Instálalo manualmente: doble clic en nexo-ca.crt → Instalar → Equipo local → Entidades de certificación raíz de confianza" -ForegroundColor Yellow
    }
} else {
    Write-Host "      nexo-ca.crt no encontrado en $certPath" -ForegroundColor Red
    Write-Host "      Descárgalo del servidor o cópialo desde NeXoNetwork-Server/certs/" -ForegroundColor Yellow
}

# ── 3. Actualizar hosts de Windows ───────────────────────────────────────────
Write-Host "[3/4] Actualizando archivo hosts de Windows..." -ForegroundColor Yellow

$nintendoDomains = @(
    "dauth-lp1.ndas.srv.nintendo.net",
    "aauth-lp1.ndas.srv.nintendo.net",
    "accounts.nintendo.com",
    "api.accounts.nintendo.com",
    "cdn.accounts.nintendo.com",
    "e97b8a9d672e4ce4845b-sb.baas.nintendo.com",
    "d78dbb08cf698e042d54-sb.baas.nintendo.com",
    "ed9e2f05d286b7b8ceda-sb.baas.nintendo.com",
    "a9e5b722a406f9cee4ea-sb.baas.nintendo.com",
    "e1c218b5657e4e03b6e0-sb.baas.nintendo.com",
    "7fbcac5a1e52b070d5a2-sb.baas.nintendo.com",
    "9dc9e6e4765c77a5d4d1-sb.baas.nintendo.com",
    "f4a0f589eca62d8e8f79-sb.baas.nintendo.com",
    "friends.lp1.s.n.srv.nintendo.net",
    "friends-lp1.s.n.srv.nintendo.net",
    "api.lp1.npln.srv.nintendo.net",
    "bcat-list-lp1.cdn.nintendo.net",
    "bcat-dl-lp1.cdn.nintendo.net",
    "tagaya.hac.lp1.eshop.nintendo.net",
    "shogun-lp1.eshop.nintendo.net",
    "beach.hac.lp1.eshop.nintendo.net",
    "api.hac.lp1.eshop.nintendo.net",
    "ctest.cdn.nintendo.net",
    "nasc.nintendowifi.net",
    "conntest.nintendowifi.net"
)

$blockedDomains = @(
    "receive-lp1.er.srv.nintendo.net",
    "receive-lp1.dg.srv.nintendo.net",
    "atum.hac.lp1.d4c.nintendo.net",
    "sun.hac.lp1.d4c.nintendo.net",
    "aqua.hac.lp1.d4c.nintendo.net",
    "pushmo.hac.lp1.er.nintendo.net"
)

# Leer hosts actual y eliminar bloque anterior si existe
$hostsContent = Get-Content $HOSTS_FILE -Raw
if ($hostsContent -match [regex]::Escape($MARKER_START)) {
    $hostsContent = $hostsContent -replace "(?s)$([regex]::Escape($MARKER_START)).*?$([regex]::Escape($MARKER_END))\r?\n?", ""
    Write-Host "      Bloque anterior eliminado." -ForegroundColor Gray
}

# Crear nuevo bloque
$newBlock = "`n$MARKER_START`n"
$newBlock += "# Generado por setup-emulator.ps1 — $(Get-Date -Format 'yyyy-MM-dd HH:mm')`n"
foreach ($domain in $nintendoDomains) {
    $newBlock += "$nexoIP $domain`n"
}
foreach ($domain in $blockedDomains) {
    $newBlock += "0.0.0.0 $domain`n"
}
$newBlock += "$MARKER_END`n"

# Escribir archivo actualizado
$hostsContent + $newBlock | Set-Content $HOSTS_FILE -Encoding ASCII -NoNewline
Write-Host "      Hosts actualizado con $($nintendoDomains.Count) dominios redirigidos + $($blockedDomains.Count) bloqueados." -ForegroundColor Green

# ── 4. Configurar emulador ───────────────────────────────────────────────────
Write-Host "[4/4] Configurando emulador NeXo-emu..." -ForegroundColor Yellow

# Buscar directorio de datos del emulador
$possibleDirs = @(
    "$EMU_DIR\user",
    "$EMU_DIR\portable",
    "$env:APPDATA\NeXo-emu",
    "$env:APPDATA\yuzu",
    "$env:APPDATA\suyu"
)

$emuDataDir = $null
foreach ($dir in $possibleDirs) {
    if (Test-Path $dir) {
        $emuDataDir = $dir
        break
    }
}

if ($emuDataDir) {
    Write-Host "      Directorio del emulador: $emuDataDir" -ForegroundColor Green

    # Crear/actualizar config de red
    $configDir = Join-Path $emuDataDir "config"
    if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }

    $configFile = Join-Path $configDir "qt-config.ini"
    if (Test-Path $configFile) {
        $config = Get-Content $configFile -Raw

        # Actualizar URL del web service si existe
        if ($config -match "web_api_url") {
            $config = $config -replace "web_api_url=.*", "web_api_url=https://$NEXO_DOMAIN"
            Write-Host "      web_api_url actualizado." -ForegroundColor Green
        }
        if ($config -match "network_interface") {
            Write-Host "      network_interface encontrado." -ForegroundColor Gray
        }

        Set-Content $configFile $config -Encoding UTF8
    } else {
        Write-Host "      Config no encontrado — el emulador lo creará al primer inicio." -ForegroundColor Gray
    }
} else {
    Write-Host "      Directorio del emulador no encontrado en rutas estándar." -ForegroundColor Yellow
    Write-Host "      Abre NeXo-emu manualmente y configura la cuenta desde Herramientas → Perfil" -ForegroundColor Yellow
}

# ── Resumen ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Setup completado. Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Abre NeXo-emu" -ForegroundColor White
Write-Host "  2. Ve a Herramientas → Configurar → Web" -ForegroundColor White
Write-Host "     Perfil → Añadir cuenta" -ForegroundColor White
Write-Host "  3. Se abrirá el navegador → login en NeXoNetwork" -ForegroundColor White
Write-Host "  4. ¡Listo para jugar online!" -ForegroundColor White
Write-Host ""
Write-Host "  Servidor: https://$NEXO_DOMAIN" -ForegroundColor Green
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
