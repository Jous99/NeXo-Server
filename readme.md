# 🌿 Eden Network (Server)

**Eden Network** es el nuevo servidor diseñado para dar soporte y evolucionar la infraestructura del antiguo proyecto *Raptor Network*. 

Este servidor actúa como el "cerebro" de la red, permitiendo que los clientes basados en el motor de emulación **Yuzu** puedan conectarse, sincronizarse y operar en un entorno moderno y estable.

---

## 🚀 ¿Qué hace este servidor?

1. **Punto de Conexión:** Recibe las peticiones del cliente (basado en Yuzu) y gestiona la comunicación.
2. **Capa de Compatibilidad:** Entiende el protocolo antiguo de Raptor para que los binarios originales sigan funcionando.
3. **Nueva Infraestructura:** Implementa mejoras de seguridad y velocidad que el servidor original no tenía.
4. **Gestión de Red:** Coordina la base de datos y los estados de la red descentralizada.

---

## 📁 Estructura Simple

* `src/` - El código fuente del servidor Eden.
* `docs/` - Notas sobre cómo funciona el protocolo de red.
* `config/` - Archivos para configurar la conexión y la base de datos.

---

## 🛠 Estado del Proyecto: **En Desarrollo**

Actualmente estamos utilizando **ingeniería inversa** sobre el cliente original de Raptor para mapear todas las funciones necesarias y replicarlas en este nuevo servidor.

### Próximos pasos:
* [ ] Completar el sistema de "Handshake" (saludo inicial del cliente).
* [ ] Replicar la base de datos de usuarios.
* [ ] Habilitar la sincronización de estados de emulación.

---

## ⚠️ Nota de Seguridad
Este es un proyecto de investigación y desarrollo. El código está en fase **Alpha** y debe ser utilizado en entornos controlados de prueba.

---
*Construyendo un nuevo paraíso para la emulación descentralizada.*