const { User } = require('../models');

// REGISTRO
exports.webRegister = async (req, res) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            return res.status(400).send("Faltan datos en el formulario.");
        }

        const [user, created] = await User.findOrCreate({
            where: { email },
            defaults: { username, password, email }
        });

        if (!created) return res.status(400).send("El correo ya existe.");

        res.send(`<script>alert('¡Cuenta Creada!'); window.location.href='/login.html';</script>`);
    } catch (e) {
        res.status(500).send("Error interno en el registro.");
    }
};

// LOGIN
exports.webLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username, password } });

        if (!user) {
            return res.send(`<script>alert('Usuario o clave incorrecta'); window.location.href='/login.html';</script>`);
        }

        // Redirigimos al Dashboard estilo Nintendo
        res.redirect('/dashboard.html');
    } catch (e) {
        res.status(500).send("Error en el login.");
    }
};

// OBTENER PERFIL (Para el Dashboard)
exports.getProfile = async (req, res) => {
    try {
        // Nota: Aquí deberías usar sesiones. Por ahora buscamos el último usuario para pruebas.
        const user = await User.findOne({ order: [['createdAt', 'DESC']] });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: "No se pudo cargar el perfil" });
    }
};