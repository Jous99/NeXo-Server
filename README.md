# NeXoNetwork-Server

![Backend](https://img.shields.io/badge/Backend-Go%20%7C%20C%23-blue)
![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)
![Status](https://img.shields.io/badge/Status-Development-green)

**NeXoNetwork-Server** es la infraestructura de backend diseñada para emular y sustituir los servicios propietarios de Nintendo Switch Online (NSO). Este servidor actúa como el núcleo central para el ecosistema **NeXo**, permitiendo el juego en línea, la gestión de perfiles y la persistencia de datos en servidores independientes controlados por la comunidad.

## 🎯 Objetivos del Proyecto

El servidor de **NeXoNetwork** proporciona las herramientas necesarias para una experiencia online completa:
* **Matchmaking Independiente:** Sistema de emparejamiento compatible con los protocolos de red de los juegos.
* **Gestión de Cuentas:** Registro y autenticación segura para los clientes NeXo.
* **Cloud Saves:** Almacenamiento y sincronización de partidas guardadas en la nube.
* **Social Hub:** Listas de amigos, presencia en línea y notificaciones en tiempo real.

## 🚀 Requisitos del Sistema

* **Entorno:** Docker (altamente recomendado) o entorno compatible con .NET Core / Go.
* **Base de Datos:** PostgreSQL para datos persistentes y Redis para la gestión de sesiones en tiempo real.
* **Red:** Acceso a internet con puertos específicos abiertos para la comunicación con los clientes (configurable en `config.yaml`).

## 🛠️ Instalación y Despliegue

### 1. Clonar el repositorio
```bash
git clone [https://forgejo.joustech.space/NeXo/NeXoNetwork-Server.git](https://forgejo.joustech.space/NeXo/NeXoNetwork-Server.git)
cd NeXoNetwork-Server