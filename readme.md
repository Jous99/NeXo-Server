# 🌌 Eden Network Core - Integrated Server

Este repositorio contiene el núcleo del servidor de **Eden Network**. Es un ecosistema híbrido que gestiona la comunicación con el cliente del juego (Emulador), la plataforma de gestión web y la persistencia de datos en MySQL.

---

## 🏗️ Arquitectura del Sistema

El servidor actúa como un puente entre tres pilares fundamentales:

1.  **Client API (v1)**: Rutas que alimentan al emulador para login, registros, perfiles y estados de suscripción.
2.  **Web Platform**: Interfaz de usuario para que los jugadores gestionen sus cuentas desde el navegador.
3.  **Data Layer**: Sincronización automática de modelos mediante Sequelize y MySQL.



---

## 🛠️ Stack Tecnológico

* **Runtime**: Node.js
* **Framework**: Express.js
* **ORM**: Sequelize (MySQL)
* **Seguridad**: Protocolo HTTPS Nativo (Certs SSL)
* **Logs**: Morgan & Custom Debugger

---

## ⚙️ Configuración del Entorno
