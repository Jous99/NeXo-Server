# 🌐 NeXo Network: Independent Server Infrastructure
### High-Performance Backend | Node.js & MySQL Implementation

![Server Status](https://img.shields.io/badge/Server-Development-00BDFF?style=for-the-badge&logo=node.js&logoColor=white)
![Database](https://img.shields.io/badge/Database-MySQL_8.0-orange?style=for-the-badge&logo=mysql&logoColor=white)
![Network](https://img.shields.io/badge/Protocol-HTTPS_|_WSS-E60012?style=for-the-badge)

## 📖 Explicación del Proyecto
**NeXo Network Server** es el núcleo de servicios diseñado para recibir, procesar y responder a las peticiones del cliente `raptorcitrus` previamente interceptadas. Este servidor actúa como un "espejo" de alta fidelidad que emula el comportamiento de la red original, permitiendo una infraestructura de juego totalmente independiente. 

Utilizando **Node.js** para la lógica de red y **MySQL** para la persistencia, NeXo habilita funciones sociales y de sincronización que normalmente estarían bloqueadas tras servidores propietarios.

---

## 🚀 Características del Servidor

### 1. Sistema de Amistad Online Real (Social Engine)
* **Presence Server:** Gestión de estados en tiempo real (Disponible, Ausente, Jugando) mediante WebSockets para una respuesta inmediata.
* **Relational Social Graph:** Base de datos en **MySQL** diseñada para manejar solicitudes de amistad, listas de contactos y bloqueos de forma bidireccional.
* **Rich Presence Data:** Difusión de metadatos de juego hacia todos los amigos conectados para mostrar actividad detallada.

### 2. Matchmaking & Lobby Service
* **Room Orchestrator:** Servidor de emparejamiento que gestiona la creación y el descubrimiento de salas de juego (Lobbies) privadas y públicas.
* **STUN/TURN Integration:** Facilitación de conexiones P2P entre jugadores para asegurar la mínima latencia en partidas multijugador.

### 3. Cloud Data Persistence
* **SaveData Cloud Storage:** Repositorio centralizado para los archivos de guardado interceptados, permitiendo la subida y descarga automática entre sesiones del usuario.
* **Profile Management:** Almacenamiento seguro de credenciales, avatares personalizados y estadísticas de juego vinculados a la cuenta de NeXo.

### 4. API & Protocol Emulation
* **RESTful Endpoints:** Implementación de rutas Express.js que replican exactamente la estructura JSON esperada por el cliente de Raptor.
* **Dynamic Content Delivery:** Servidor de recursos para la distribución de noticias, iconos y actualizaciones del sistema.

---

## 🛠️ Stack Tecnológico

* **Runtime:** Node.js v20+ (LTS)
* **Framework:** Express.js para la API REST.
* **Real-time:** Socket.io / WebSockets para el sistema de presencia.
* **Database:** MySQL 8.0 para la gestión de usuarios y relaciones sociales.
* **Security:** Implementación de JWT (JSON Web Tokens) para sesiones seguras.

---

## ⚠️ Nota Legal
Este software es un proyecto de preservación de código abierto y sin fines de lucro. NeXo Network no está afiliado a ninguna empresa de hardware o software. El servidor está diseñado exclusivamente para interactuar con clientes modificados con fines de investigación.

---
<p align="center">
  <img src="https://img.shields.io/badge/BACKEND-NODEJS-00BDFF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/INFRASTRUCTURE-NEXO_PROJECT-E60012?style=for-the-badge" />
</p>