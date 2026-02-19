# 🌌 Eden Network Server

El núcleo de servicios en la nube para el ecosistema **Eden**. Este servidor es el motor que transforma una experiencia de emulación solitaria en una red social viva, gestionando la identidad, la persistencia y la conectividad global de los usuarios.

## 📡 El Corazón de la Red
Eden Server replica y evoluciona la arquitectura de servicios web de alto rendimiento. No es solo un almacén de datos; es el árbitro que valida cada conexión y mantiene la integridad de la comunidad.

* **Identidad Digital:** Gestión avanzada de perfiles de usuario y sincronización de estados.
* **Seguridad por Hardware:** Implementación de validación mediante `R-HardwareId` para garantizar un entorno justo y seguro.
* **Sistema de Tokens:** Autenticación dinámica basada en JWT (JSON Web Tokens) para sesiones fluidas y protegidas.
* **Social Hub:** El backend que alimenta las listas de amigos y las notificaciones en tiempo real que verás en el cliente.

## 🛠️ Arquitectura de Comunicación
El servidor está diseñado para responder con precisión quirúrgica a las peticiones del **[Eden Client](https://forgejo.joustech.space/Eden/Client)**.

1.  **Handshake:** El cliente solicita acceso mediante el sistema de login.
2.  **Validación:** El servidor comprueba las credenciales y el Hardware ID.
3.  **Autorización:** Se emite un JWT interno que permite al cliente acceder a los servicios online.
4.  **Servicios:** Apertura de endpoints para amigos, mensajería y presencia online.

## 📂 Organización del Proyecto
* `/api`: Endpoints de alto rendimiento para la comunicación directa con el emulador.
* `/database`: Lógica de persistencia y esquemas de datos para el ecosistema.
* `/config`: Gestión de variables de entorno y conectividad de red.

---
> "Conectando mundos, construyendo el jardín digital."  
> **Eden Emulator Project - 2026**