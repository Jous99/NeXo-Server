# Eden Network Server 🌐

Este repositorio contiene el **Backend Core** de Eden Network. Es el encargado de gestionar la autenticación, la persistencia de datos de usuario y los servicios sociales para el ecosistema Eden.

## 🚀 Arquitectura del Sistema
El servidor actúa como el puente entre el Cliente (Emulador) y la Base de Datos, replicando el comportamiento del antiguo RaptorNetwork pero optimizado para Eden.

* **API Engine:** Escrito en PHP para una implementación rápida en entornos tipo aaPanel/Nginx.
* **Autenticación:** Sistema basado en JWT (JSON Web Tokens) para sesiones seguras.
* **Identificación:** Validación de usuarios mediante Hardware ID (HWID) único.
* **Base de Datos:** Estructura SQL para la gestión de amigos, perfiles y estadísticas.

## 📂 Estructura del Repositorio
* `/api`: Endpoints que consume el cliente (ej. `verify_login`, `friends`, `jwt`).
* `/database`: Esquemas `.sql` para la creación de tablas.
* `/config`: Archivos de configuración para la conexión a la DB (ignorar en commits).
* `/logs`: Registro de actividad del servidor y auditoría de hardware.

## 🛠️ Requisitos de Instalación
1.  **Web Server:** Nginx o Apache (recomendado usar aaPanel).
2.  **PHP:** Versión 7.4 o superior con extensiones `pdo_mysql` y `openssl`.
3.  **MySQL:** Base de datos activa para el almacenamiento de usuarios.

## 🔗 Conexión con el Cliente
Este servidor está diseñado para responder a las peticiones del **[Eden Client](https://forgejo.joustech.space/Eden/Client)**. 
Para una implementación local (Desarrollo), asegúrese de que el cliente apunte a la IP de su servidor o a `http://127.0.0.1/eden/`.

---

## 🔒 Seguridad
* El servidor valida el `R-HardwareId` enviado por el cliente en cada petición.
* Los tokens JWT tienen una duración limitada y se refrescan mediante el endpoint `/jwt/internal`.

---
*Desarrollado para Eden Emulator Project - 2026*