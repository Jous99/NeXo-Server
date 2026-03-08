# NeXoNetwork-Server

![Backend](https://img.shields.io/badge/Backend-Go%20%7C%20C%23-blue)
![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)
![Network](https://img.shields.io/badge/Protocol-Eden%20Network-green)

**NeXoNetwork-Server** es el núcleo de infraestructura diseñado para emular y reemplazar los servicios propietarios de Nintendo Switch Online (NSO). Este servidor permite la creación de redes privadas seguras para el juego en línea, gestión de perfiles, matchmaking y servicios de datos en la nube.

## 🎯 Objetivos del Proyecto

El servidor de **NeXoNetwork** busca devolver la soberanía del juego en línea a la comunidad mediante:
* **Reemplazo de NSO:** Implementación de protocolos compatibles con servicios de matchmaking y listas de amigos.
* **Persistencia de Datos:** Sistema de guardado en la nube (Cloud Saves) independiente.
* **Latencia Ultra Baja:** Optimización de rutas para partidas multijugador competitivas.

## 🌐 Configuración de Red Obligatoria

Para el correcto funcionamiento de la infraestructura y la interconexión con los clientes **NeXo**, este servidor requiere el uso de **Eden Network**.

> [!IMPORTANT]
> **Compatibilidad de Red:** Este servidor ha sido testeado y optimizado exclusivamente para **Eden Network**. El uso de redes alternativas como Raptor Network no está soportado y puede causar fallos críticos en la sincronización de paquetes y en la validación de sesiones de usuario.

## 🚀 Requisitos del Sistema

* **Entorno:** Docker (recomendado) o entorno compatible con .NET Core / Go (según la rama).
* **Base de Datos:** PostgreSQL o Redis para el almacenamiento de sesiones en tiempo real.
* **Puertos:** Asegúrate de abrir los puertos UDP/TCP configurados en el archivo `config.yaml`.

## 🛠️ Instalación y Despliegue

### 1. Clonar el repositorio
```bash
git clone [https://forgejo.joustech.space/NeXo/NeXoNetwork-Server.git](https://forgejo.joustech.space/NeXo/NeXoNetwork-Server.git)
cd NeXoNetwork-Server