# Cómo crear un módulo de juego

NeXo-Server usa una arquitectura modular donde cada juego que necesita servidor propio tiene su propio módulo en `src/modules/games/`.

---

## Estructura de un módulo de juego

```
src/modules/games/mario-kart/
├── index.js          # Entry point — exporta las rutas Fastify
├── routes.js         # Definición de endpoints
├── service.js        # Lógica de negocio (salas, matchmaking, etc.)
└── README.md         # Descripción del módulo y protocolo
```

---

## Ejemplo mínimo

**`src/modules/games/mi-juego/index.js`:**
```javascript
'use strict';

async function miJuegoModule(fastify) {
    // GET /games/mi-juego/rooms
    fastify.get('/rooms', {
        preHandler: [fastify.authenticate]
    }, async (req, reply) => {
        return reply.send({ ok: true, data: [] });
    });

    // POST /games/mi-juego/rooms
    fastify.post('/rooms', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name:     { type: 'string', maxLength: 64 },
                    password: { type: 'string' },
                    max_players: { type: 'number', minimum: 2, maximum: 8 },
                }
            }
        }
    }, async (req, reply) => {
        // Crear sala
        return reply.code(201).send({ ok: true, data: { room_id: 'xxx' } });
    });
}

module.exports = miJuegoModule;
```

**Registrar en `src/server.js`:**
```javascript
const miJuego = require('./modules/games/mi-juego');
// ...
fastify.register(miJuego, { prefix: '/games/mi-juego' });
```

---

## Convenciones

- Todos los endpoints de juego van bajo `/games/<nombre-juego>/`
- Siempre usar `fastify.authenticate` en endpoints que requieren login
- Usar el pool de DB compartido desde `../../../db`
- Documentar el protocolo en el `README.md` del módulo

---

## Módulos de juego planificados

| Juego | Estado | Endpoints principales |
|-------|--------|----------------------|
| Matchmaking genérico | 🚧 Desarrollo | `/games/rooms/*` |
| Mario Kart | 📋 Planificado | `/games/mario-kart-8-deluxe/*` |
| Mario Maker 2 | 📋 Planificado | `/games/mario-maker-2/*` |
