const axios = require('axios');

async function testLogin() {
    console.log("--- Test NeXo Network (IP: 192.168.0.200) ---");
    try {
        // La petición va al puerto 80 (HTTP estándar) y aaPanel la pasa al 3000
        const response = await axios.post('http://accounts-api-lp1.nexonetwork.space/api/v1/login', {
            hardware_id: "NEXO-LOCAL-TEST-001",
            username: "Jous_Local_User"
        });

        console.log("✅ Conexión Exitosa!");
        console.log("Respuesta del Servidor:", response.data);
        
    } catch (error) {
        console.error("❌ Fallo en la conexión");
        if (error.response) {
            console.log("El servidor respondió con error:", error.response.status);
            console.log("Detalle:", error.response.data);
        } else {
            console.log("Error de red (¿Está el servidor encendido?):", error.message);
        }
    }
}

testLogin();