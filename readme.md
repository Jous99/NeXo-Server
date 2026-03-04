# 🌌 Eden Network Core

![Version](https://img.shields.io/badge/Version-1.0.0-gold?style=for-the-badge)
![Environment](https://img.shields.io/badge/Environment-Development-blue?style=for-the-badge)
![Network](https://img.shields.io/badge/Network-Eden_Exclusive-blueviolet?style=for-the-badge)

## 📖 Sobre el Proyecto
**Eden Network Core** es una infraestructura de servidor centralizada diseñada para actuar como el "cerebro" de un ecosistema de juegos emulados. A diferencia de los servidores estándar, Eden Network integra un sistema de **bypass de redirección** que permite tomar el control total sobre el cliente (emulador), eliminando la dependencia de servidores externos y centralizando la gestión de usuarios en una base de datos local privada.

### Características Principales:
* **Gestión de Identidad**: Sistema de registro y login persistente mediante Sequelize.
* **Protocolo de Intercepción**: Rutas específicas para engañar al emulador y forzar el uso de interfaces locales.
* **Seguridad End-to-End**: Implementación nativa de HTTPS para cumplir con los requisitos de seguridad del cliente.
* **Sincronización de Perfiles**: Motor de entrega de metadatos de usuario (niveles, suscripciones, rangos).

---

## 🛠 Arquitectura de Conexión



1.  **Handshake**: El emulador consulta si debe redirigir al usuario. Eden responde `redirect: false`.
2.  **Auth**: El usuario ingresa credenciales; el servidor valida contra MySQL (XAMPP).
3.  **Session**: Se genera un token de sesión único para Eden Network.
4.  **Sync**: El emulador descarga el perfil y el estado de suscripción para habilitar el acceso.

---

## 🚀 Guía de Inicio Rápido

1.  **Infraestructura**: Inicia MySQL en XAMPP.
2.  **Red**: Configura el archivo `hosts` con los dominios de Raptor Network apuntando a `127.0.0.1`.
3.  **Certificados**: Asegúrate de que `server.key` y `server.cert` estén en `/certs`.
4.  **Ejecución**:
    ```bash
    npm install
    node index.js
    ```

---

## 🗺 Roadmap de Desarrollo (2026)

Este roadmap marca la evolución de **Eden Network** de un simple servidor de login a una plataforma completa de gestión.

### 🟢 Fase 1: Cimentación (Completado)
* [x] Configuración de servidor HTTPS base.
* [x] Bypass de redirección del emulador.
* [x] Integración de base de datos MySQL/Sequelize.
* [x] Rutas de Login y Registro básico.

### 🟡 Fase 2: Expansión de Servicios (En progreso)
* [ ] **Dashboard de Usuario**: Interfaz web funcional para cambiar contraseñas y ver estadísticas.
* [ ] **Sistema de Logs Avanzado**: Registro de auditoría para detectar intentos de login fallidos.
* [ ] **Middleware de Roles**: Diferenciación clara entre usuarios Free, Premium y Administradores.
* [ ] **Auto-Mirror**: Sincronización automática de Forgejo a GitHub para backups.

### 🔵 Fase 3: Ecosistema Completo (Futuro)
* [ ] **Tienda Integrada (Shop)**: API para compra de ítems o mejoras desde el perfil.
* [ ] **Launcher Propietario**: Creación de un ejecutable que automatice la configuración de hosts y certificados.
* [ ] **Multi-Server Support**: Capacidad para gestionar múltiples instancias de juego desde un solo panel.

---

## 📂 Organización de Archivos
* `src/models/`: Definición de la estructura de datos.
* `src/routes/`: Cerebro de la lógica del cliente y la web.
* `public/`: La cara visible de Eden Network (Frontend).
* `certs/`: Capa de seguridad SSL.

---
**© 2026 Eden Network.** *Construyendo el futuro de la emulación privada.*