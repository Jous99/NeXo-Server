# Compilar NeXo-Emu

Guía completa para compilar el emulador NeXo desde el código fuente. NeXo-Emu está basado en Yuzu y usa CMake + C++20.

---

## Requisitos del sistema

### Windows

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|---------|
| Visual Studio | 2022 (Build Tools) | [visualstudio.microsoft.com](https://visualstudio.microsoft.com) |
| CMake | 3.15+ | [cmake.org](https://cmake.org/download/) |
| Git | Cualquiera | [git-scm.com](https://git-scm.com) |
| Python | 3.8+ | [python.org](https://python.org) |
| Vulkan SDK | 1.3+ | [lunarg.com](https://vulkan.lunarg.com/sdk/home) |

En Visual Studio Installer, marcar los componentes:
- **Desktop development with C++**
- **Windows 10/11 SDK**
- **MSVC v143 compiler**

### Linux (Ubuntu 22.04 / Debian 12)

```bash
sudo apt update
sudo apt install -y \
  build-essential cmake git python3 \
  libsdl2-dev libvulkan-dev vulkan-validationlayers \
  libboost-dev libssl-dev libmbedtls-dev \
  libavcodec-dev libavutil-dev libswscale-dev \
  libfmt-dev nlohmann-json3-dev \
  qtbase5-dev qt5-qmake qtwebengine5-dev \
  nasm yasm pkg-config
```

---

## Clonar el repositorio

```bash
git clone https://github.com/Jous99/NeXo-Emu.git
cd NeXo-Emu

# Inicializar TODOS los submódulos (importante — son ~20)
git submodule update --init --recursive
```

> ⚠️ El paso de submódulos descarga varios GB. Puede tardar 10-30 minutos según tu conexión.

Los submódulos clave incluyen: `dynarmic`, `cubeb`, `SDL`, `mbedtls`, `cpp-httplib`, `cpp-jwt`, `Vulkan-Headers`, `sirit`, `ffmpeg`, `enet`, entre otros.

---

## Compilar en Linux

```bash
# Desde la raíz del repo
mkdir build && cd build

# Configurar (Release)
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_QT=ON \
  -DENABLE_SDL2=ON \
  -DENABLE_WEB_SERVICE=ON \
  -DYUZU_ENABLE_BOXCAT=OFF \
  -DUSE_DISCORD_PRESENCE=OFF

# Compilar usando todos los núcleos disponibles
make -j$(nproc)
```

El binario resultante estará en `build/bin/yuzu` (o `nexo`).

### Compilación de solo la interfaz sin Qt (más rápido para pruebas)

```bash
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_QT=OFF \
  -DENABLE_SDL2=ON \
  -DENABLE_WEB_SERVICE=ON

make -j$(nproc)
# Binario: build/bin/yuzu-cmd
```

---

## Compilar en Windows

```bash
# Desde PowerShell o CMD (con Visual Studio en PATH)
mkdir build
cd build

cmake .. -G "Visual Studio 17 2022" -A x64 `
  -DCMAKE_BUILD_TYPE=Release `
  -DENABLE_QT=ON `
  -DENABLE_SDL2=ON `
  -DYUZU_USE_BUNDLED_QT=ON `
  -DYUZU_USE_BUNDLED_SDL2=ON `
  -DENABLE_WEB_SERVICE=ON

cmake --build . --config Release --parallel
```

El binario estará en `build\bin\Release\yuzu.exe`.

---

## Configurar los dominios de NeXoNetwork

El emulador ya viene preconfigurado con los dominios de NeXoNetwork en el código fuente. Si quieres apuntar a un servidor propio:

Busca en el código fuente (en `src/`) las referencias a la URL del servidor, típicamente en archivos como:
- `src/web_service/web_backend.cpp`
- `src/web_service/nexo_network.cpp`

Y reemplaza la URL base por la tuya:
```cpp
// Ejemplo — la URL real depende de la implementación exacta
const std::string NEXO_API_URL = "https://nexonetwork.space";
```

Luego recompila.

---

## Verificar que el emulador se conecta al servidor

Al arrancar el emulador, debería hacer una petición a:
```
GET https://nexonetwork.space/api/v1/server/info
```

Puedes verificarlo con Wireshark o simplemente revisando los logs del servidor NeXo-Server:
```bash
pm2 logs nexo-server | grep "server/info"
```

Si ves la petición, el emulador está conectado correctamente.

---

## Problemas frecuentes de compilación

**Error: submodule not found**
```bash
git submodule update --init --recursive --force
```

**Error: CMake version too old**
```bash
# En Ubuntu, instala CMake más nuevo desde el PPA oficial
sudo apt remove cmake
pip3 install cmake
cmake --version
```

**Error: Vulkan SDK not found (Linux)**
```bash
# Instalar Vulkan SDK desde LunarG
wget -qO- https://packages.lunarg.com/lunarg-signing-key-pub.asc | sudo apt-key add -
sudo wget -qO /etc/apt/sources.list.d/lunarg-vulkan.list \
  https://packages.lunarg.com/vulkan/lunarg-vulkan-focal.list
sudo apt update && sudo apt install vulkan-sdk
```

**Error: NASM/YASM not found (FFmpeg)**
```bash
sudo apt install nasm yasm
```

**Error de compilación en mbedtls / OpenSSL (conflicto)**

Este es el conflicto más común en Yuzu/NeXo. Asegúrate de usar la versión de mbedtls incluida como submódulo, no la del sistema:
```bash
cmake .. -DYUZU_USE_BUNDLED_MBEDTLS=ON  # si existe esta opción
# o simplemente asegúrate de no tener libmbedtls-dev instalado:
sudo apt remove libmbedtls-dev
```

---

## Estructura de los archivos relevantes para la red

```
src/
├── web_service/          # Capa de comunicación con NeXoNetwork
│   ├── web_backend.cpp   # Cliente HTTP (usa cpp-httplib)
│   └── nexo_network.cpp  # Endpoints específicos de NeXo
├── core/
│   └── core.cpp          # Inicialización — llama a web_service al arrancar
└── ...
```

Los submódulos relevantes para la red:
- `externals/cpp-httplib` — cliente HTTP que hace las peticiones al servidor
- `externals/cpp-jwt` — manejo de JWT en el lado del emulador
- `externals/mbedtls` — criptografía / TLS
