# 🌌 Eden Network Server: Arquitectura de Preservación NSO

Este repositorio constituye el núcleo de servicios de red (Backend) del proyecto **Eden**. Su función principal es la ingeniería inversa y el despliegue de una infraestructura capaz de emular las funciones de **Nintendo Switch Online (NSO)**, utilizando la robusta base de **RaptorNetwork** para su integración en el ecosistema **Yuzu (Eden)**.

## ⚙️ Especificaciones Técnicas

El servidor actúa como un **Middleware de Servicios Web**, gestionando la capa de comunicación entre el emulador y los datos persistentes del usuario.

* **Protocolo de Comunicación:** Implementación de una API RESTful que procesa peticiones HTTP/JSON mediante el motor `httplib` del cliente.
* **Capa de Seguridad (Auth):** Sistema de autenticación basado en **JWT (JSON Web Tokens)**, permitiendo sesiones seguras sin necesidad de re-validación constante.
* **Integridad de Red (HWID):** Validación de identidad a nivel de hardware mediante el rastreo de `R-HardwareId`, garantizando la seguridad y trazabilidad de las conexiones.
* **Social Engine:** Microservicios dedicados a la gestión de *Presence* (estado online), *Friends List* y *Notification Queues* en tiempo real.

## 🛠️ Flujo de Trabajo: El "Trasplante"

Para lograr la integración total, este servidor se sincroniza con el código fuente del **[Eden Client](https://forgejo.joustech.space/Eden/Client)** siguiendo este proceso:

1. **Intercepción:** El cliente Eden utiliza el `web_backend` heredado de Raptor para redirigir las llamadas de red hacia este servidor local.
2. **Handshake Técnico:** Se valida el hardware y se emite un token de acceso temporal.
3. **Sincronización:** El servidor sirve los archivos JSON necesarios para que el emulador active las pestañas de "Amigos" y "Juego Online".



## 📂 Organización de Módulos
* `/api`: Controladores de los endpoints (Login, JWT, Social).
* `/database`: Esquemas de persistencia SQL para perfiles y estadísticas.
* `/lib`: Lógica compartida para el procesamiento de cabeceras de red.

---
> "Ingeniería aplicada a la preservación del juego conectado."  
> **Eden Network Project - 2026**