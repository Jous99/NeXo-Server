# 🌌 Eden Network Core

![Project Status](https://img.shields.io/badge/Status-Active_Development-green?style=for-the-badge)
![Purpose](https://img.shields.io/badge/Purpose-Preservation-orange?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Yuzu-red?style=for-the-badge)

**Eden Network** es un proyecto de ingeniería inversa dedicado a la creación de un servidor de reemplazo para los servicios de **Nintendo Switch Online (NSO)**. Al igual que proyectos como *Pretendo* o *Wiimmfi*, nuestro objetivo es emular la infraestructura de red para permitir que los usuarios mantengan sus funciones sociales, de perfil y de juego activas en entornos controlados y privados.

---

## ⚠️ Aviso Legal y Descargo de Responsabilidad
**Este proyecto NO está afiliado, asociado, autorizado, respaldado ni conectado oficialmente de ninguna manera con Nintendo Co., Ltd. ni con ninguna de sus subsidiarias.**

* **Código 100% Original**: Eden Network no utiliza, distribuye ni contiene código propietario, archivos binarios ni recursos filtrados de los servidores oficiales de Nintendo. 
* **Finalidad**: Este es un proyecto de investigación y preservación histórica. Se basa exclusivamente en la observación del tráfico de red y la ingeniería inversa de protocolos públicos.
* **Uso Responsable**: El uso de este software debe realizarse respetando los términos de servicio locales y solo con fines educativos o de respaldo personal.

---

## 🤔 ¿Qué es Eden Network?
Cuando una consola se conecta a internet, busca servidores específicos para validar la identidad del usuario, su suscripción y sus datos de perfil. **Eden Network** emula estas respuestas.

Actúa como un "Man-in-the-Middle" (MitM) que intercepta las peticiones dirigidas a la infraestructura original (Raptor/NSO) y las resuelve localmente. Esto permite:
1.  **Autenticación Independiente**: Crear cuentas sin depender de los servidores oficiales.
2.  **Gestión de Suscripciones**: Simular estados "Premium" o "Lifetime" para desbloquear funciones del cliente.
3.  **Preservación de Perfiles**: Almacenar localmente el progreso y metadatos del jugador.



---

## 🚀 Roadmap de Desarrollo

### 🟢 Fase 1: Núcleo de Identidad (Completado)
* [x] **Bypass de Redirección**: Evita que el cliente fuerce el uso de portales web externos.
* [x] **Motor de Autenticación**: Sistema de login basado en MySQL con persistencia real.
* [ ] **Servicio de Suscripción**: Emulación de respuestas de estado de cuenta activo.
* [x] **Infraestructura HTTPS**: Implementación de seguridad mediante TLS para cumplimiento de protocolos del cliente.

### 🟡 Fase 2: Servicios Sociales (En Desarrollo)
* [ ] **Friend Search**: Emulación de búsqueda y gestión de amigos.
* [ ] **Presence API**: Sistema para mostrar qué está jugando el usuario en tiempo real.
* [ ] **Eden Dashboard**: Panel web para que el usuario gestione su perfil desde cualquier navegador.
* [ ] **Centralización de Logs**: Monitorización de errores de protocolo en tiempo real.

### 🔵 Fase 3: Ecosistema Extendido (Futuro)
* [ ] **Matchmaking Privado**: Infraestructura básica para salas de juego locales.
* [ ] **Ranking & Leaderboards**: Tablas de clasificación globales de la red.
* [ ] **DNS Automático**: Script para configurar el entorno de red con un solo clic.

---

## 🛠 Instalación Técnica

1.  **Requisitos**: Node.js, MySQL (XAMPP) y certificados SSL en `/certs`.
2.  **Red**: Redirige los dominios mediante el archivo `hosts`:
    ```text
    127.0.0.1 accounts-api-lp1.raptor.network
    127.0.0.1 login-lp1.raptor.network
    ```
3.  **Arranque**:
    ```bash
    npm install
    node index.js
    ```

---

## 📂 Estructura del Repositorio
* `src/models/`: Modelos de datos para usuarios y sesiones.
* `src/routes/`: Controladores de red que imitan los endpoints de NSO.
* `public/`: Assets para la interfaz web de Eden.

---
© 2026 **Eden Network Ecosystem**. *Dedicados a la preservación de la experiencia online.*