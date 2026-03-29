import express from 'express';

const app = express();
app.use(express.json());

const PORT = 80;

// Log para ver qué está pidiendo el emulador en tiempo real
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.hostname}${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('NeXo Accounts Server is running');
});

// El endpoint que busca el emulador para listar juegos
app.get('/api/v1/titles', (req, res) => {
    res.json([
        { title_id: "0100000000010000", name: "NeXo Test Game" }
    ]);
});

// El endpoint de Login
app.post('/v1/login', (req, res) => {
    const { username, password, hardware_id } = req.body;
    
    console.log(`🔑 Intento de login: ${username} (HWID: ${hardware_id})`);

    // Por ahora aceptamos cualquier usuario para probar
    res.json({
        status: "success",
        token: "nexo_session_" + Math.random().toString(36).substring(7),
        user: {
            username: username,
            id: 100
        }
    });
});

app.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log('🚀 NEXO NETWORK SERVER ONLINE');
    console.log('📡 Escuchando peticiones de NexoNetwork-Citrus');
    console.log('----------------------------------------------------');
});